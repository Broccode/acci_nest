import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisProvider } from './redis.provider';
import { RedisHealthIndicator } from './redis.health';

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