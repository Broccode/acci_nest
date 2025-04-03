/**
 * Example logging configuration for different environments
 *
 * This file shows recommended logging configurations for different environments.
 * Copy the relevant section to your app.module.ts when registering the LoggingModule.
 */

import { LoggingModuleOptions } from '../interfaces';

/**
 * Development environment configuration
 * - Pretty printing for better readability in development
 * - Debug level to see all logs
 * - Synchronous logging for easier debugging
 */
export const developmentLoggingConfig: LoggingModuleOptions = {
  logging: {
    level: 'debug',
    prettyPrint: true,
    // Disable log retention in development
    logRetention: false,
    // Disable async logging for easier debugging
    async: false,
  },
};

/**
 * Testing environment configuration
 * - Minimal logging to reduce noise in tests
 * - Synchronous logging for predictable test execution
 * - No log rotation in test environment
 */
export const testLoggingConfig: LoggingModuleOptions = {
  logging: {
    level: 'error', // Only log errors in test environment
    prettyPrint: false,
    // Disable log retention in tests
    logRetention: false,
    // Use synchronous logging for tests
    async: false,
  },
};

/**
 * Production environment configuration
 * - JSON format for machine parsing
 * - Info level by default
 * - Async logging for better performance
 * - Log rotation enabled
 */
export const productionLoggingConfig: LoggingModuleOptions = {
  logging: {
    level: 'info',
    prettyPrint: false,
    // Enable log rotation in production
    logRetention: {
      // Keep logs for 30 days
      retentionDays: 30,
      // Rotate logs daily
      rotationInterval: '1d',
      // Maximum file size before rotation (10MB)
      maxSize: '10M',
      // Directory for log files
      directory: 'logs',
    },
    // Use async logging for better performance
    async: true,
    // Sampling to reduce log volume in high-traffic environments
    sampling: {
      // Sample debug logs at 10% rate
      sampleRate: {
        debug: 0.1,
        // Sample info logs at 50% rate
        info: 0.5,
        // Log all warnings and errors
        warn: 1,
        error: 1,
      },
    },
  },
};

/**
 * Usage example in app.module.ts:
 *
 * ```typescript
 * import { Module } from '@nestjs/common';
 * import { LoggingModule } from './infrastructure';
 *
 * @Module({
 *   imports: [
 *     LoggingModule.register({
 *       logging: {
 *         level: process.env.LOG_LEVEL || 'info',
 *         prettyPrint: process.env.NODE_ENV !== 'production',
 *         logRetention: process.env.NODE_ENV === 'production' ? {
 *           retentionDays: 30,
 *           rotationInterval: '1d',
 *           maxSize: '10M',
 *           directory: 'logs',
 *         } : false,
 *         async: process.env.NODE_ENV === 'production',
 *       },
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
