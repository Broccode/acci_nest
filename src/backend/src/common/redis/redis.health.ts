import { Inject, Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../constants';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  /**
   * Performs health check on Redis connection
   * @param key Name of the health check
   * @returns HealthIndicatorResult with Redis health status
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Test connection with PING command
      const pong = await this.redis.ping();
      
      if (pong !== 'PONG') {
        throw new Error('Redis server did not respond correctly to PING');
      }

      // Get server info for additional diagnostics
      const info = await this.redis.info();
      const infoLines = info.split('\r\n');
      
      // Extract useful metrics
      const metrics: Record<string, any> = {};
      const metricsToExtract = [
        'redis_version', 'uptime_in_seconds', 'connected_clients',
        'used_memory_human', 'total_connections_received'
      ];
      
      infoLines.forEach(line => {
        const parts = line.split(':');
        if (parts.length === 2) {
          const key = parts[0].trim();
          if (metricsToExtract.includes(key)) {
            metrics[key] = parts[1].trim();
          }
        }
      });

      return this.getStatus(key, true, { 
        ...metrics,
        responseTime: await this.measureResponseTime()
      });
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error instanceof Error ? error.message : String(error)}`, 
                       error instanceof Error ? error.stack : undefined);
      
      throw new HealthCheckError(
        'Redis health check failed', 
        this.getStatus(key, false, { 
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      );
    }
  }

  /**
   * Measures Redis response time in milliseconds
   * @returns Response time in milliseconds
   */
  private async measureResponseTime(): Promise<number> {
    try {
      const start = Date.now();
      await this.redis.ping();
      return Date.now() - start;
    } catch (error) {
      this.logger.warn(`Could not measure Redis response time: ${error instanceof Error ? error.message : String(error)}`);
      return -1;
    }
  }
} 