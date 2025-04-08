import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggingService } from '../../logging/interfaces';
import { LOGGING_SERVICE } from '../../logging/logging.module';
import { DomainException } from '../exceptions';

/**
 * Error response interface for consistent response structure
 */
interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  correlationId?: string;
  message: string;
  [key: string]: unknown;
}

/**
 * Extended request interface with tenant information
 */
interface RequestWithTenant extends Request {
  tenantId?: string;
}

/**
 * Global exception filter that handles all exceptions in the application
 * Provides consistent error responses and logging
 */
@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(@Inject(LOGGING_SERVICE) private readonly loggingService: LoggingService) {}

  /**
   * Handle exceptions thrown during request processing
   * @param exception - The caught exception
   * @param host - Arguments host
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Extract correlation ID from request
    const correlationId = request.headers['x-correlation-id'] as string;

    // Extract tenant ID if available
    const tenantId = (request as RequestWithTenant).tenantId;

    // Prepare log context
    const logContext = {
      correlationId,
      tenantId,
      path: request.url,
      method: request.method,
    };

    // Determine status code and error details
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
      message: 'Internal server error',
    };

    // Handle different types of exceptions
    if (exception instanceof DomainException) {
      // Domain exception with standardized format
      const domainException = exception as DomainException;
      status = exception.getStatus();
      errorResponse = {
        ...errorResponse,
        ...(exception.getResponse() as object),
        statusCode: status,
      };

      // Log with appropriate level and context
      this.loggingService.warn(`Domain exception: ${domainException.message}`, {
        ...logContext,
        errorCode: domainException.errorCode,
        context: domainException.context,
      });
    } else if (exception instanceof HttpException) {
      // Standard NestJS HTTP exception
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      errorResponse = {
        ...errorResponse,
        statusCode: status,
        errorCode: 'HTTP_EXCEPTION',
        message:
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : ((exceptionResponse as Record<string, unknown>).message as string) ||
              'HTTP exception',
      };

      // Log with appropriate level based on status code
      if (status >= 500) {
        this.loggingService.error(
          `HTTP exception: ${errorResponse.message}`,
          exception as Error,
          logContext
        );
      } else {
        this.loggingService.warn(`HTTP exception: ${errorResponse.message}`, logContext);
      }
    } else {
      // Unexpected error
      this.loggingService.error(
        'Unhandled exception',
        exception instanceof Error ? exception : new Error(String(exception)),
        logContext
      );
    }

    // Send response
    response.status(status).json(errorResponse);
  }
}
