import { DynamicModule, Module } from '@nestjs/common';
import { RedisMockProvider } from './redis-mock.provider';
import { RedisHealthIndicator } from './redis.health';

/**
 * Redis test module that provides mock implementation for testing
 */
@Module({})
export class RedisTestModule {
  /**
   * Registers the Redis test module with mock implementation
   * @returns Dynamic module configuration with Redis mock providers
   */
  static register(): DynamicModule {
    return {
      module: RedisTestModule,
      providers: [
        RedisMockProvider,
        {
          provide: RedisHealthIndicator,
          useValue: {
            isHealthy: jest.fn().mockResolvedValue(true),
            checkConnection: jest.fn().mockResolvedValue({
              redis: { status: 'up' },
            }),
          },
        },
      ],
      exports: [RedisMockProvider, RedisHealthIndicator],
      global: true,
    };
  }
}
