import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import * as compressionLib from 'compression';
import { NextFunction, Request, Response } from 'express';

/**
 * Middleware for compressing HTTP responses
 * Reduces bandwidth usage and improves performance for clients
 */
@Injectable()
export class CompressionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CompressionMiddleware.name);
  private readonly compressionMiddleware: any;

  constructor() {
    try {
      // Handle both ESM and CommonJS imports
      const compression =
        typeof compressionLib === 'function' ? compressionLib : (compressionLib as any).default;

      this.compressionMiddleware = compression();
    } catch (error) {
      this.logger.error(
        'Failed to initialize compression middleware',
        error instanceof Error ? error.stack : String(error)
      );
      // Fallback to no compression
      this.compressionMiddleware = (req: Request, res: Response, next: NextFunction) => next();
    }
  }

  /**
   * Applies the compression middleware to requests
   * @param req - HTTP request
   * @param res - HTTP response
   * @param next - Next middleware function
   */
  use(req: Request, res: Response, next: NextFunction): void {
    this.compressionMiddleware(req, res, next);
  }
}
