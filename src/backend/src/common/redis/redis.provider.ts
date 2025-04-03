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
    // Commands without response can be ignored to avoid hanging connections
    enableOfflineQueue: false,
  };

  const redisClient = new Redis(redisOptions);
  
  // Add error handler
  redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
  });
  
  // Cleanup logic on termination
  redisClient.on('end', () => {
    console.log('Redis connection properly terminated');
  });
  
  // Log connection status
  redisClient.on('connect', () => {
    console.log('Redis connection established');
  });
  
  // On Node process exit, client should be properly disconnected
  process.on('beforeExit', async () => {
    try {
      if (redisClient.status === 'ready') {
        console.log('Disconnecting Redis connection during shutdown...');
        await redisClient.disconnect();
        await redisClient.quit();
      }
    } catch (error) {
      console.error('Error disconnecting Redis connection during shutdown:', error);
    }
  });

  return redisClient;
};

/**
 * Redis provider for dependency injection
 */
export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: createRedisClient,
}; 