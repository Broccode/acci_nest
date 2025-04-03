import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisHealthIndicator } from './redis.health';
import { RedisProvider } from './redis.provider';

export interface RedisModuleOptions {
  connectionName?: string;
  isGlobal?: boolean;
}

@Module({})
export class RedisModule {
  /**
   * Registers the Redis module with specified options
   * @param options Module configuration options
   * @returns Dynamic module configuration
   */
  static register(options: RedisModuleOptions = {}): DynamicModule {
    return {
      module: RedisModule,
      imports: [ConfigModule],
      providers: [RedisProvider, RedisHealthIndicator],
      exports: [RedisProvider, RedisHealthIndicator],
      global: options.isGlobal || false,
    };
  }
}
