import { Inject, Injectable, Optional } from '@nestjs/common';
import { Logger as PinoLogger, pino, LoggerOptions } from 'pino';
import { PinoLoggingService, LogContext } from '../interfaces';
import { CorrelationIdService, TenantContextService } from '../context';

/**
 * Configuration options for the Pino logging service
 */
export interface PinoLoggingOptions {
  /**
   * Log level (debug, info, warn, error, fatal)
   * @default 'info'
   */
  level?: string;
  
  /**
   * Pretty print logs (development only)
   * @default false
   */
  prettyPrint?: boolean;
  
  /**
   * Array of sensitive fields to redact from logs
   * @default ['password', 'token', 'authorization', 'cookie']
   */
  redactFields?: string[];
  
  /**
   * Base context to include in all logs
   */
  baseContext?: Record<string, any>;
}

/**
 * Default sensitive fields to redact from logs
 */
const DEFAULT_REDACT_FIELDS = [
  'password',
  'token',
  'authorization',
  'cookie',
  'secret',
  'key',
  'refreshToken',
  'accessToken',
  'cardNumber',
  'cvv',
];

/**
 * Default logging options
 */
const DEFAULT_OPTIONS: PinoLoggingOptions = {
  level: 'info',
  prettyPrint: process.env.NODE_ENV === 'development',
  redactFields: DEFAULT_REDACT_FIELDS,
};

/**
 * Service to provide structured logging using Pino
 * Implements correlation tracking and tenant-aware logging
 */
@Injectable()
export class PinoLoggingServiceImpl implements PinoLoggingService {
  private logger: PinoLogger;
  private options: PinoLoggingOptions;

  constructor(
    @Optional() private readonly correlationService: CorrelationIdService,
    @Optional() private readonly tenantContext: TenantContextService,
    @Optional() @Inject('PINO_OPTIONS') options: PinoLoggingOptions = {},
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Configure Pino logger
    const loggerOptions: LoggerOptions = {
      level: this.options.level,
      redact: this.options.redactFields,
      timestamp: pino.stdTimeFunctions.isoTime,
      base: {
        pid: process.pid,
        hostname: process.env.HOSTNAME || 'unknown',
        ...this.options.baseContext,
      },
    };

    if (this.options.prettyPrint) {
      loggerOptions.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          levelFirst: true,
          translateTime: 'SYS:standard',
        },
      };
    }
    
    this.logger = pino(loggerOptions);
  }

  /**
   * Get the base context with correlation ID and tenant ID
   */
  private getBaseContext(additionalContext?: LogContext): Record<string, any> {
    return {
      correlationId: this.correlationService?.getCurrentCorrelationId(),
      tenantId: this.tenantContext?.getCurrentTenant(),
      ...additionalContext,
    };
  }

  /**
   * Log a message at debug level
   */
  debug(message: string, context?: LogContext): void {
    this.logger.debug(this.getBaseContext(context), message);
  }

  /**
   * Log a message at info level
   */
  info(message: string, context?: LogContext): void {
    this.logger.info(this.getBaseContext(context), message);
  }

  /**
   * Log a message at warn level
   */
  warn(message: string, context?: LogContext): void {
    this.logger.warn(this.getBaseContext(context), message);
  }

  /**
   * Log a message at error level
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.logger.error(
      {
        ...this.getBaseContext(context),
        err: error
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack,
            }
          : undefined,
      },
      message,
    );
  }

  /**
   * Log a message at fatal level
   */
  fatal(message: string, error?: Error, context?: LogContext): void {
    this.logger.fatal(
      {
        ...this.getBaseContext(context),
        err: error
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack,
            }
          : undefined,
      },
      message,
    );
  }

  /**
   * Create a child logger with additional context
   */
  createChildLogger(additionalContext: LogContext): PinoLoggingService {
    const childOptions = { ...this.options };
    childOptions.baseContext = {
      ...this.options?.baseContext,
      ...additionalContext,
    };

    const childService = new PinoLoggingServiceImpl(
      this.correlationService,
      this.tenantContext,
      childOptions,
    );

    return childService;
  }

  /**
   * Get the underlying Pino logger instance
   */
  getPinoLogger(): PinoLogger {
    return this.logger;
  }
} 