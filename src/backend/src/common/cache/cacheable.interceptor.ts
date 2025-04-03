import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { TenantContext } from '../../tenants/services/tenant-context.service';
import { TENANT_CONTEXT } from '../constants';
import { CACHE_TAGS_METADATA, CACHE_TTL_METADATA } from './cache.constants';
import { RedisCacheService } from './redis-cache.service';

/**
 * Interceptor for method-level caching
 * Automatically caches method results based on metadata
 */
@Injectable()
export class CacheableInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheableInterceptor.name);

  constructor(
    private readonly cacheService: RedisCacheService,
    private readonly reflector: Reflector,
    @Inject(TENANT_CONTEXT) private readonly tenantContext: TenantContext
  ) {}

  /**
   * Generates a cache key based on method parameters and tenant
   * @param className - Class name
   * @param methodName - Method name
   * @param args - Method arguments
   * @returns Generated cache key
   */
  private generateCacheKey(className: string, methodName: string, args: any[]): string {
    const argsString = args
      .map((arg) => {
        try {
          return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
        } catch (error) {
          this.logger.warn(
            'Failed to stringify argument',
            error instanceof Error ? error.stack : String(error)
          );
          return 'unstringifiable';
        }
      })
      .join(':');

    return `${className}:${methodName}:${argsString}`;
  }

  /**
   * Intercepts method execution for caching
   * @param context - Execution context
   * @param next - Call handler
   * @returns Observable with the method result (cached or fresh)
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const methodName = context.getHandler().name;
    const className = context.getClass().name;

    // Get cache metadata from method
    const ttl = this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler());
    const tags = this.reflector.get<string[]>(CACHE_TAGS_METADATA, context.getHandler());

    // If no TTL is set, the method is not cacheable
    if (ttl === undefined) {
      return next.handle();
    }

    // Get current tenant
    let tenant: string | null = null;
    try {
      if (this.tenantContext.hasTenant()) {
        tenant = this.tenantContext.getCurrentTenant();
      }
    } catch (error) {
      // If we can't get tenant, proceed without tenant-specific caching
      this.logger.debug('No tenant in context for caching, using global cache');
    }

    // Create cache options
    const cacheOptions = {
      ttl,
      tags,
      tenant: tenant || undefined,
    };

    // Generate a cache key
    const args = context.getArgByIndex(0);
    const cacheKey = this.generateCacheKey(className, methodName, Object.values(args || {}));

    return of(true).pipe(
      // Try to get from cache first
      switchMap(async () => {
        try {
          const cachedValue = await this.cacheService.get(cacheKey, cacheOptions);
          if (cachedValue !== null) {
            this.logger.debug(`Cache hit for ${cacheKey}`);
            return { fromCache: true, value: cachedValue };
          }

          this.logger.debug(`Cache miss for ${cacheKey}`);
          return { fromCache: false };
        } catch (error) {
          this.logger.error(
            `Cache error for ${cacheKey}`,
            error instanceof Error ? error.stack : String(error)
          );
          return { fromCache: false };
        }
      }),
      // If not in cache, execute the handler and cache the result
      switchMap((result) => {
        if (result.fromCache) {
          return of(result.value);
        }

        return next.handle().pipe(
          tap(async (data) => {
            try {
              await this.cacheService.set(cacheKey, data, cacheOptions);
              this.logger.debug(`Cached result for ${cacheKey}`);
            } catch (error) {
              this.logger.error(
                `Failed to cache result for ${cacheKey}`,
                error instanceof Error ? error.stack : String(error)
              );
              // Continue execution - method completes successfully even if caching fails
            }
          })
        );
      })
    );
  }
}
