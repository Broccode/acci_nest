import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base domain exception that all application exceptions should extend
 * Provides a standardized structure for domain-specific errors
 */
export class DomainException extends HttpException {
  /** Error code for programmatic handling */
  public readonly errorCode: string;

  /** Additional error context */
  public readonly context?: Record<string, unknown>;

  /**
   * Create a new domain exception
   * @param message - Human-readable error message
   * @param errorCode - Unique error code for programmatic handling
   * @param status - HTTP status code
   * @param context - Additional context information
   */
  constructor(
    message: string,
    errorCode: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    context?: Record<string, unknown>
  ) {
    super(
      {
        message,
        errorCode,
        status,
        timestamp: new Date().toISOString(),
        context,
      },
      status
    );

    this.errorCode = errorCode;
    this.context = context;
  }
}
