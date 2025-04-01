import { Module } from '@nestjs/common';
import { LoggingExampleController } from './logging.controller';

/**
 * Module for example controllers demonstrating infrastructure features
 */
@Module({
  controllers: [LoggingExampleController],
})
export class ExamplesModule {} 