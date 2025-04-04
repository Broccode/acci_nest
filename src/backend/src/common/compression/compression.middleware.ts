import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import * as compressionLib from 'compression';
import { NextFunction, Request, Response } from 'express';

/**
 * Type definition for middleware function to avoid type conflicts
 */
type MiddlewareHandler = (req: Request, res: Response, next: NextFunction) => void;

/**
 * Middleware for compressing HTTP responses
 * Reduces bandwidth usage and improves performance for clients
 */
@Injectable()
export class CompressionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CompressionMiddleware.name);
  // Using explicit function type instead of 'Function'
  private readonly compressionMiddleware: MiddlewareHandler;

  constructor() {
    try {
      // Handle both ESM and CommonJS imports
      const compression =
        typeof compressionLib === 'function'
          ? compressionLib
          : (compressionLib as unknown as { default: typeof compressionLib }).default;

      // Double-casting to overcome type conflicts
      this.compressionMiddleware = compression() as unknown as MiddlewareHandler;
    } catch (error) {
      this.logger.error(
        'Failed to initialize compression middleware',
        error instanceof Error ? error.stack : String(error)
      );
      // Fallback to no compression
      this.compressionMiddleware = (_req: unknown, _res: unknown, next: NextFunction) => next();
    }
  }

  /**
   * Applies the compression middleware to requests
   * @param req - HTTP request
   * @param res - HTTP response
   * @param next - Next middleware function
   */
  use(req: Request, res: Response, next: NextFunction): void {
    // Direct call is now type-safe
    this.compressionMiddleware(req, res, next);
  }
}
