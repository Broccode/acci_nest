import { Module } from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service';
import { RateLimitGuard } from './rate-limit.guard';
import { RedisModule } from '../redis/redis.module';
import { TenantsModule } from '../../tenants/tenants.module';

/**
 * Module for rate limiting functionality
 * Provides services and guards for limiting request rates to prevent abuse
 */
@Module({
  imports: [
    RedisModule.register({
      isGlobal: false,
    }),
    TenantsModule
  ],
  providers: [RateLimiterService, RateLimitGuard],
  exports: [RateLimiterService, RateLimitGuard],
})
export class RateLimitModule {} 