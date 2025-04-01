import { Module } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { PerformanceInterceptor } from './performance.interceptor';
import { RedisModule } from '../redis/redis.module';

/**
 * Module for application performance monitoring
 * Provides services and interceptors for tracking and analyzing performance metrics
 */
@Module({
  imports: [RedisModule],
  providers: [PerformanceService, PerformanceInterceptor],
  exports: [PerformanceService, PerformanceInterceptor],
})
export class PerformanceModule {} 