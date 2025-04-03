import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './filters';

export interface ExceptionsModuleOptions {
  /**
   * Whether to register the global exception filter
   * @default true
   */
  enableGlobalFilter?: boolean;
}

const defaultOptions: ExceptionsModuleOptions = {
  enableGlobalFilter: true,
};

/**
 * Module for exception handling and standardized error responses
 * Provides domain-specific exceptions and global exception filter
 */
@Global()
@Module({})
export class ExceptionsModule {
  static register(options: ExceptionsModuleOptions = {}): DynamicModule {
    const moduleOptions = { ...defaultOptions, ...options };

    const providers: Provider[] = [];

    // Register global exception filter if enabled
    if (moduleOptions.enableGlobalFilter !== false) {
      providers.push({
        provide: APP_FILTER,
        useClass: GlobalExceptionFilter,
      });
    }

    return {
      module: ExceptionsModule,
      providers,
      exports: [],
    };
  }
}
