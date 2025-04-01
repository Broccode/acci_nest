import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis, RedisOptions } from 'ioredis';
import { REDIS_CLIENT } from '../constants';

/**
 * Factory Provider for Redis client
 * @param configService NestJS ConfigService
 * @returns Configured Redis client instance
 */
export const createRedisClient = (configService: ConfigService): Redis => {
  const redisConfig = configService.get('redis');
  
  const redisOptions: RedisOptions = {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password || undefined,
    db: redisConfig.db,
    connectionName: 'acci-nest',
    connectTimeout: redisConfig.connectionTimeout,
    commandTimeout: redisConfig.commandTimeout,
    retryStrategy: (times: number) => {
      if (times > redisConfig.retryAttempts) {
        return null; // Stop retrying
      }
      return redisConfig.retryDelay; // Retry delay in ms
    },
    maxRetriesPerRequest: redisConfig.retryAttempts,
  };

  return new Redis(redisOptions);
};

/**
 * Redis provider for dependency injection
 */
export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: createRedisClient,
}; 