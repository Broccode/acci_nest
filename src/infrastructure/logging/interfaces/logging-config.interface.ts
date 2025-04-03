/**
 * Configuration options for log rotation
 */
export interface LogRetentionOptions {
  /**
   * Number of days to keep logs
   */
  retentionDays?: number;

  /**
   * Interval for log rotation (e.g., '1d', '12h')
   */
  rotationInterval?: string;

  /**
   * Maximum size before rotation (e.g., '10M', '1G')
   */
  maxSize?: string;

  /**
   * Directory to store log files
   */
  directory?: string;
}

/**
 * Configuration for log sampling
 */
export interface LogSamplingOptions {
  /**
   * Sample rate for each log level (0-1)
   * 1 means log everything, 0 means log nothing
   */
  sampleRate?: {
    debug?: number;
    info?: number;
    warn?: number;
    error?: number;
    fatal?: number;
  };
}

/**
 * Configuration options for the logging module
 */
export interface LoggingOptions {
  /**
   * Log level ('debug', 'info', 'warn', 'error', 'fatal')
   */
  level?: string;

  /**
   * Whether to format logs for human readability
   */
  prettyPrint?: boolean;

  /**
   * Log rotation configuration
   * Set to false to disable log retention
   */
  logRetention?: LogRetentionOptions | false;

  /**
   * Whether to use asynchronous logging
   */
  async?: boolean;

  /**
   * Log sampling configuration to reduce volume in high-traffic environments
   */
  sampling?: LogSamplingOptions;
}

/**
 * Complete configuration for the logging module
 */
export interface LoggingModuleOptions {
  /**
   * Logging configuration
   */
  logging?: LoggingOptions;
}
