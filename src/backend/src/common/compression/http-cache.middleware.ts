import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/**
 * Middleware for setting HTTP cache headers
 * Improves performance by enabling browser and CDN caching
 */
@Injectable()
export class HttpCacheMiddleware implements NestMiddleware {
  private readonly logger = new Logger(HttpCacheMiddleware.name);

  constructor() {}

  /**
   * Applies cache control headers to responses
   * @param req - HTTP request
   * @param res - HTTP response
   * @param next - Next middleware function
   */
  use(req: Request, res: Response, next: NextFunction): void {
    // Skip cache headers for non-GET methods
    if (req.method !== 'GET') {
      return next();
    }

    // Set default cache control header
    res.setHeader('Cache-Control', 'public, max-age=300');

    next();
  }
} 