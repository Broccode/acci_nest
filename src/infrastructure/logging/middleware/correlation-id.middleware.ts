import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CorrelationIdService } from '../context';

/**
 * Middleware to extract or generate correlation IDs and maintain them throughout the request lifecycle
 * This helps in tracking requests across different services and components
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly correlationService: CorrelationIdService) {}

  /**
   * Process the incoming request to extract or generate a correlation ID
   */
  use(req: Request, res: Response, next: NextFunction): void {
    // Extract correlation ID from request header or generate a new one
    const headerName = CorrelationIdService.HEADER_NAME;
    let correlationId = req.headers[headerName] as string;

    if (!correlationId) {
      correlationId = this.correlationService.generateCorrelationId();
      req.headers[headerName] = correlationId;
    }

    // Set correlation ID in response header
    res.setHeader(headerName, correlationId);

    // Run the next middleware in a correlation ID context
    this.correlationService.runWithCorrelationId(correlationId, () => {
      next();
    });
  }
} 