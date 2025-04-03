import { CanActivate, ExecutionContext, Inject, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { TenantContext } from '../../tenants/services/tenant-context.service';
import { TENANT_CONTEXT } from '../constants';
import {
  RATE_LIMIT_DURATION_KEY,
  RATE_LIMIT_KEY_PREFIX_KEY,
  RATE_LIMIT_POINTS_KEY,
} from './rate-limit.constants';
import { RateLimiterService } from './rate-limiter.service';

/**
 * Guard for implementing rate limiting at the endpoint level
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiterService: RateLimiterService,
    @Inject(TENANT_CONTEXT) private readonly tenantContext: TenantContext
  ) {}

  /**
   * Determines if a request is allowed based on rate limiting rules
   * @param context - Execution context
   * @returns Whether the request is allowed
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const points = this.reflector.getAllAndOverride<number>(RATE_LIMIT_POINTS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Skip rate limiting if not configured
    if (!points) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    const duration =
      this.reflector.getAllAndOverride<number>(RATE_LIMIT_DURATION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || 60; // Default 1 minute

    const keyPrefix =
      this.reflector.getAllAndOverride<string>(RATE_LIMIT_KEY_PREFIX_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || 'rate-limit:';

    try {
      // Get identifier for rate limiting (IP, user ID, etc.)
      let identifier = request.ip || 'unknown-ip';

      // Add user ID if authenticated
      if (request.user && (request.user as Record<string, unknown>).id) {
        identifier = `user:${(request.user as Record<string, unknown>).id as string}:${identifier}`;
      }

      // Add tenant context for multi-tenant rate limiting
      let tenantId: string | null = null;
      try {
        tenantId = this.tenantContext.getCurrentTenant();
      } catch (error) {
        // Tenant might not be available in all contexts
        this.logger.debug('No tenant available for rate limiting');
      }

      if (tenantId) {
        identifier = `tenant:${tenantId}:${identifier}`;
      }

      return this.rateLimiterService
        .consume(identifier, {
          points,
          duration,
          keyPrefix,
        })
        .then((result) => {
          // Add rate limit headers to response
          response.header('X-RateLimit-Limit', String(points));
          response.header(
            'X-RateLimit-Remaining',
            String(result.remainingPoints >= 0 ? result.remainingPoints : 0)
          );
          response.header(
            'X-RateLimit-Reset',
            String(Math.ceil(result.resetTime.getTime() / 1000))
          );

          if (!result.isAllowed) {
            response.status(429);
            response.header(
              'Retry-After',
              String(Math.ceil((result.resetTime.getTime() - Date.now()) / 1000))
            );
          }

          return result.isAllowed;
        });
    } catch (error) {
      this.logger.error(
        'Rate limit guard error',
        error instanceof Error ? error.stack : String(error)
      );
      return true; // Fail open on error
    }
  }
}
