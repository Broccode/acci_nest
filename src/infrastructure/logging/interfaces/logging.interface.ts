import { LogContext } from './log-context.interface';
import { LogLevel } from './log-level.enum';

/**
 * Core logging service interface
 */
export interface LoggingService {
  /**
   * Log a message at debug level
   * @param message - Message to log
   * @param context - Additional context information
   */
  debug(message: string, context?: LogContext): void;

  /**
   * Log a message at info level
   * @param message - Message to log
   * @param context - Additional context information
   */
  info(message: string, context?: LogContext): void;

  /**
   * Log a message at warn level
   * @param message - Message to log
   * @param context - Additional context information
   */
  warn(message: string, context?: LogContext): void;

  /**
   * Log a message at error level
   * @param message - Message to log
   * @param error - Optional error object
   * @param context - Additional context information
   */
  error(message: string, error?: Error, context?: LogContext): void;

  /**
   * Log a message at fatal level
   * @param message - Message to log
   * @param error - Optional error object
   * @param context - Additional context information
   */
  fatal(message: string, error?: Error, context?: LogContext): void;

  /**
   * Create a child logger with additional context
   * @param additionalContext - Context to include in all logs
   */
  createChildLogger(additionalContext: LogContext): LoggingService;
}
