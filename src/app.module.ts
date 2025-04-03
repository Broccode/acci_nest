import { Module } from '@nestjs/common';
import { ExamplesModule } from './examples/examples.module';
import { ExceptionsModule, LoggingModule } from './infrastructure';

/**
 * Root application module
 */
@Module({
  imports: [
    // Configure logging with default options
    LoggingModule.register({
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        prettyPrint: process.env.NODE_ENV !== 'production',
      },
    }),

    // Configure exceptions handling
    ExceptionsModule.register(),

    // Example module for testing
    ExamplesModule,
  ],
})
export class AppModule {}
