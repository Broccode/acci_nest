import { Module } from '@nestjs/common';
import { TenantsModule } from '../../tenants/tenants.module';
import { RedisModule } from '../redis/redis.module';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimiterService } from './rate-limiter.service';

/**
 * Module for rate limiting functionality
 * Provides services and guards for limiting request rates to prevent abuse
 */
@Module({
  imports: [
    RedisModule.register({
      isGlobal: false,
    }),
    TenantsModule,
  ],
  providers: [RateLimiterService, RateLimitGuard],
  exports: [RateLimiterService, RateLimitGuard],
})
export class RateLimitModule {}
