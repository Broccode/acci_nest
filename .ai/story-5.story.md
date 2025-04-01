# Epic-1 - Story-5

Logging and Exception Handling Framework

**As a** developer
**I want** a comprehensive logging and exception handling framework
**So that** errors can be consistently managed, tracked, and troubleshooting is streamlined.

## Status

Completed

## Context

- This story builds upon the core framework infrastructure established in previous stories.
- Consistent logging is critical for debugging, monitoring, and auditing in enterprise applications.
- A standardized approach to exception handling ensures uniform error responses across the application.
- Correlating logs across microservices and components requires a systematic approach.
- Different environments (development, staging, production) need appropriate logging levels and formats.
- Security-relevant events must be properly recorded for audit purposes.
- Performance impact of logging should be minimized.
- Pino will be used as the logging library due to its excellent performance and native JSON support.

## Acceptance Criteria

1. **Logging Service**
   - A standardized logging service with Pino is implemented
   - All logs are output in structured JSON format
   - Correlation IDs are consistently tracked across requests
   - Different log levels for various environments are supported
   - Sensitive data is automatically redacted/masked from logs

2. **Exception Handling**
   - All exceptions are uniformly processed through a global filter
   - Domain-specific exception classes are implemented and in use
   - Exceptions are mapped to appropriate HTTP status codes
   - Error responses have a consistent format with correlation ID

3. **Multi-Tenant Support**
   - All logs include tenant context where applicable
   - Logs can be filtered by tenant
   - Tenant isolation in log storage is implemented

4. **Performance**
   - Logging has minimal impact on application performance (<5% overhead)
   - Asynchronous logging is implemented for high-volume events
   - Log sampling and throttling mechanisms are in place

5. **Monitoring Integration**
   - Integration with log aggregation services is implemented
   - Health check endpoints with logging are available
   - Critical error notifications are supported

## Estimation

Story Points: 3

## Tasks

1. - [x] Logging Service Implementation
   1. - [x] Design and implement a LoggingService with Pino as the base
   2. - [x] Configure environment-specific logging behavior
   3. - [x] Implement structured logging with JSON format
   4. - [x] Add correlation ID tracking across requests
   5. - [x] Create context-aware logging helpers

2. - [x] Exception Filters and Handling
   1. - [x] Create a global exception filter for NestJS
   2. - [x] Implement standardized error response format
   3. - [x] Design domain-specific exception classes
   4. - [x] Add exception mapping to appropriate HTTP status codes
   5. - [x] Implement exception logging with proper context

3. - [x] Log Storage and Rotation
   1. - [x] Configure log file storage and rotation with pino-roll
   2. - [x] Implement log compression for archived logs
   3. - [x] Set up environment-specific log retention policies
   4. - [x] Create a mechanism for secure log access

4. - [x] Monitoring Integration
   1. - [x] Implement hooks for critical error notifications
   2. - [x] Create integration points for monitoring systems
   3. - [x] Add support for log aggregation services
   4. - [x] Implement health check endpoints with logging

5. - [x] Tenant-Aware Logging
   1. - [x] Ensure all logs include tenant context when applicable
   2. - [x] Create tenant-specific log filters
   3. - [x] Implement tenant-based log isolation
   4. - [x] Add tenant information to correlation tracking

6. - [x] Performance Optimization
   1. - [x] Implement asynchronous logging where appropriate
   2. - [x] Add log sampling for high-volume events
   3. - [x] Create log level throttling mechanisms
   4. - [x] Optimize serialization of log objects

7. - [x] Debugging Utilities
   1. - [x] Create debug mode with enhanced logging
   2. - [x] Implement request/response logging for troubleshooting
   3. - [x] Add stack trace processing and formatting
   4. - [x] Build log analysis utilities

8. - [x] Testing the Logging Framework
   1. - [x] Create unit tests for all logging components
   2. - [x] Implement integration tests for exception handling
   3. - [x] Perform performance tests to validate minimal overhead
   4. - [x] Create E2E tests to verify log output and error handling

9. - [x] Documentation and Integration
   1. - [x] Create comprehensive developer documentation with examples
   2. - [x] Document log formats and error code list
   3. - [x] Integrate with existing system components
   4. - [x] Create best practice guidelines for developers

## Constraints

- Logging must have minimal impact on application performance (<5% overhead)
- Sensitive data must be automatically redacted from logs
- The logging system must be extensible to support different backends
- Exception handling must be consistent across the application
- The log format must support both human readability and machine parsing
- Correlation IDs must be propagated across all components
- The logging configuration must be adaptable without code changes

## Technical Implementation Details

### Logging Library

- **Pino** will be used as the primary logging library due to:
  - Superior performance through optimized JSON serialization
  - Lower overhead compared to alternatives like Winston
  - Native structured JSON logging
  - Good integration with NestJS via the nestjs-pino package

### Log Format

```json
{
  "level": "info",
  "time": "2023-07-15T11:22:33.123Z",
  "pid": 12345,
  "hostname": "server-1",
  "correlationId": "c4d3-1234-5678-90ab",
  "tenantId": "tenant-abc",
  "userId": "user-123",
  "context": "UserService",
  "msg": "User login successful",
  "extra": {
    "userEmail": "user@example.com",
    "loginMethod": "password"
  }
}
```

### Log Storage

- Logs are stored in files with daily rotation
- Archived logs are compressed and stored according to defined retention policies
- High-volume production environments can be integrated with external log aggregators like ELK or Graylog

## Data Models / Schema

### LoggingService Interface

```typescript
/**
 * Log levels from least to most severe
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Context information to enrich log entries
 */
export interface LogContext {
  /** Correlation ID for request tracking */
  correlationId?: string;
  /** Tenant ID for multi-tenancy support */
  tenantId?: string;
  /** User ID if authenticated */
  userId?: string;
  /** Additional context details */
  [key: string]: any;
}

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
   * @param context - Additional context information
   */
  error(message: string, error?: Error, context?: LogContext): void;
  
  /**
   * Log a message at fatal level
   * @param message - Message to log
   * @param context - Additional context information
   */
  fatal(message: string, error?: Error, context?: LogContext): void;
  
  /**
   * Create a child logger with additional context
   * @param additionalContext - Context to include in all logs
   */
  createChildLogger(additionalContext: LogContext): LoggingService;
}

/**
 * Pino-specific implementation of the LoggingService interface
 */
export interface PinoLoggingService extends LoggingService {
  /**
   * Get the underlying Pino logger instance
   * For advanced use cases requiring direct Pino access
   */
  getPinoLogger(): any; // Pino.Logger type
}
```

### Exception Handling Classes

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base domain exception that all application exceptions should extend
 */
export class DomainException extends HttpException {
  /** Error code for programmatic handling */
  public readonly errorCode: string;
  
  /** Additional error context */
  public readonly context?: Record<string, any>;
  
  constructor(
    message: string,
    errorCode: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    context?: Record<string, any>
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

/**
 * Exception for entity not found scenarios
 */
export class EntityNotFoundException extends DomainException {
  constructor(entityName: string, id: string | number, context?: Record<string, any>) {
    super(
      `${entityName} with ID '${id}' not found`,
      'ENTITY_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      context
    );
  }
}

/**
 * Exception for validation failures
 */
export class ValidationException extends DomainException {
  constructor(errors: Record<string, string[]>, context?: Record<string, any>) {
    super(
      'Validation failed',
      'VALIDATION_FAILED',
      HttpStatus.BAD_REQUEST,
      { ...context, validationErrors: errors }
    );
  }
}

/**
 * Exception for unauthorized access attempts
 */
export class UnauthorizedException extends DomainException {
  constructor(message = 'Unauthorized access', context?: Record<string, any>) {
    super(
      message,
      'UNAUTHORIZED',
      HttpStatus.UNAUTHORIZED,
      context
    );
  }
}
```

### Global Exception Filter

```typescript
import { 
  ExceptionFilter, 
  Catch, 
  ArgumentsHost, 
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggingService } from './logging.service';
import { DomainException } from './exceptions';

/**
 * Global exception filter that handles all exceptions in the application
 * Provides consistent error responses and logging
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly loggingService: LoggingService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    // Extract correlation ID from request
    const correlationId = request.headers['x-correlation-id'] as string;
    
    // Extract tenant ID if available
    const tenantId = (request as any).tenantId;
    
    // Prepare log context
    const logContext = {
      correlationId,
      tenantId,
      path: request.url,
      method: request.method,
    };
    
    // Determine status code and error details
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: any = {
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
        ...exception.getResponse(),
        statusCode: status,
      };
      
      // Log with appropriate level and context
      this.loggingService.warn(
        `Domain exception: ${domainException.message}`,
        { ...logContext, errorCode: domainException.errorCode, context: domainException.context }
      );
    } else if (exception instanceof HttpException) {
      // Standard NestJS HTTP exception
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      errorResponse = {
        ...errorResponse,
        statusCode: status,
        message: typeof exceptionResponse === 'string' 
          ? exceptionResponse 
          : (exceptionResponse as any).message || 'HTTP exception',
      };
      
      // Log with appropriate level based on status code
      if (status >= 500) {
        this.loggingService.error(
          `HTTP exception: ${errorResponse.message}`, 
          exception, 
          logContext
        );
      } else {
        this.loggingService.warn(
          `HTTP exception: ${errorResponse.message}`, 
          logContext
        );
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
```

## Integration with the System Architecture

The logging and exception handling framework is a cross-cutting component that is integrated into the entire system:

1. **As NestJS Module**: Implementation as a standalone module that can be imported into other modules
2. **As Middleware**: Automatic logging of incoming and outgoing requests
3. **As Interceptor**: Correlation-ID tracking and performance logging
4. **As Exception Filter**: Global error handling for all requests
5. **As Service**: Direct use in other services for manual logging

The integration is done through:

- Automatic registration of the exception filter and logging middleware at the application level
- Providing the LoggingService via Dependency Injection
- Direct interaction with the monitoring module for notifications and warnings
- Integration with the Multi-Tenancy module for tenant-specific logging

## Test Strategy

1. **Unit Tests**:
   - Tests for LoggingService implementation
   - Tests for Exception classes and filter
   - Mocking of Pino and other external dependencies

2. **Integration Tests**:
   - Tests for the integration of the logging framework with other modules
   - Tests for correlation ID tracking across multiple services
   - Tests for Exception handling flow

3. **Performance Tests**:
   - Verification of logging overhead under load
   - Validation of asynchronous logging mechanisms
   - Benchmarking different logging configurations

4. **E2E Tests**:
   - Verification of log output across the entire application
   - Verification of error handling in real scenarios
   - Verification of log rotation and storage

## Chat Log

> User: Please let us now plan Story 5 of the first epic

> Assistant: [Suggestion for Story 5 bzgl. Logging and Exception-Handling-Framework]

> User: Yes, please create a corresponding story in @.ai

> Assistant: [Creation of the Story-5 File]

> User: Now please check Story 5. Is it complete and precise enough? Does it meet the Best Practices?

> Assistant: [Analysis of Story 5 with Improvement Suggestions]

> User: What is better for us suitable, Winston or Pino?

> Assistant: [Detailed Analysis of Both Logging Libraries with Recommendation for Pino due to Better Performance and JSON Support]

> User: Ok, then please adjust @story-5.story.md with the improvements suggested by you. For logging we'll take Pino.

> Assistant: [Update of the Story-5 File with Pino as Logging Library and Further Improvements]
