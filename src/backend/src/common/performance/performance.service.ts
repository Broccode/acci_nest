import { Injectable, Logger, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../constants';

/**
 * Time range options for retrieving metrics
 */
export enum MetricsTimeRange {
  MINUTE = 60,
  HOUR = 3600,
  DAY = 86400,
  WEEK = 604800,
}

/**
 * Tags for categorizing metrics
 */
export interface MetricTags {
  [key: string]: string;
}

/**
 * Service for tracking and analyzing performance metrics
 */
@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);
  private readonly METRICS_KEY_PREFIX = 'metrics:';
  private readonly MAX_METRICS_PER_KEY = 1000; // Limit to prevent memory issues

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Records a performance metric
   * @param name - Metric name
   * @param value - Metric value
   * @param tags - Optional tags for filtering
   */
  async recordMetric(name: string, value: number, tags: MetricTags = {}): Promise<void> {
    if (!name) {
      this.logger.warn('Attempted to record metric with empty name');
      return;
    }

    try {
      const timestamp = Date.now();
      const metricKey = this.buildMetricKey(name);
      const metricValue = JSON.stringify({
        timestamp,
        value,
        tags,
      });

      const pipeline = this.redis.pipeline();
      
      // Add to sorted set with timestamp as score for time-based queries
      pipeline.zadd(metricKey, timestamp, metricValue);
      
      // Trim old entries to maintain fixed size
      pipeline.zremrangebyrank(metricKey, 0, -(this.MAX_METRICS_PER_KEY + 1));
      
      // Set expiration to auto-cleanup old metrics (30 days)
      pipeline.expire(metricKey, 30 * 24 * 60 * 60);
      
      await pipeline.exec();
    } catch (error) {
      this.logger.error(`Failed to record metric: ${name}`, error instanceof Error ? error.stack : String(error));
      // Non-critical operation, continue execution
    }
  }

  /**
   * Retrieves metrics for a specific name and time range
   * @param name - Metric name
   * @param timeRange - Time range in seconds
   * @returns Array of metrics
   */
  async getMetrics(name: string, timeRange: MetricsTimeRange): Promise<any[]> {
    if (!name) {
      this.logger.warn('Attempted to get metrics with empty name');
      return [];
    }

    try {
      const metricKey = this.buildMetricKey(name);
      const now = Date.now();
      const minTime = now - (timeRange * 1000);
      
      // Get metrics within time range, sorted by timestamp
      const results = await this.redis.zrangebyscore(
        metricKey,
        minTime,
        now,
      );
      
      return results.map(result => {
        try {
          return JSON.parse(result);
        } catch (error) {
          this.logger.warn(`Failed to parse metric: ${result}`);
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      this.logger.error(`Failed to get metrics: ${name}`, error instanceof Error ? error.stack : String(error));
      return [];
    }
  }

  /**
   * Calculates average value for a metric over time range
   * @param name - Metric name
   * @param timeRange - Time range in seconds
   * @returns Average value or null if no data
   */
  async getAverageMetric(name: string, timeRange: MetricsTimeRange): Promise<number | null> {
    const metrics = await this.getMetrics(name, timeRange);
    
    if (!metrics.length) {
      return null;
    }
    
    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / metrics.length;
  }

  /**
   * Builds a standardized metric key
   * @param name - Metric name
   * @returns Redis key
   */
  private buildMetricKey(name: string): string {
    return `${this.METRICS_KEY_PREFIX}${name}`;
  }
} 