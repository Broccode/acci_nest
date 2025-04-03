import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TenantsModule } from '../../tenants/tenants.module';
import { RedisModule } from '../redis/redis.module';
import { CacheableInterceptor } from './cacheable.interceptor';
import { RedisCacheService } from './redis-cache.service';

/**
 * Configuration options for the cache module
 */
export interface CacheModuleOptions {
  /** TTL in seconds */
  ttl?: number;
  /** Maximum number of items in cache */
  max?: number;
  /** Cache namespace prefix */
  prefix?: string;
  /** Whether to register the module globally */
  isGlobal?: boolean;
}

/**
 * Module for caching functionality
 * Provides Redis-based caching capabilities with tenant awareness
 */
@Module({})
export class CacheModule {
  /**
   * Registers the cache module with specified options
   * @param options - Configuration options
   * @returns Dynamic module configuration
   */
  static register(options: CacheModuleOptions = {}): DynamicModule {
    return {
      module: CacheModule,
      imports: [
        ConfigModule,
        RedisModule.register({
          isGlobal: false,
        }),
        TenantsModule,
      ],
      providers: [RedisCacheService, CacheableInterceptor],
      exports: [RedisCacheService, CacheableInterceptor],
      global: options.isGlobal || false,
    };
  }
}
