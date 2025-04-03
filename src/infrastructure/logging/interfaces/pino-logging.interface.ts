import { Logger as PinoLogger } from 'pino';
import { LoggingService } from './logging.interface';

/**
 * Pino-specific implementation of the LoggingService interface
 */
export interface PinoLoggingService extends LoggingService {
  /**
   * Get the underlying Pino logger instance
   * For advanced use cases requiring direct Pino access
   */
  getPinoLogger(): PinoLogger;
}
