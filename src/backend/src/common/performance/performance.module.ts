import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { PerformanceInterceptor } from './performance.interceptor';
import { PerformanceService } from './performance.service';

/**
 * Module for application performance monitoring
 * Provides services and interceptors for tracking and analyzing performance metrics
 */
@Module({
  imports: [
    RedisModule.register({
      isGlobal: false,
    }),
  ],
  providers: [PerformanceService, PerformanceInterceptor],
  exports: [PerformanceService, PerformanceInterceptor],
})
export class PerformanceModule {}
