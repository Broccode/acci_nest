import * as crypto from 'crypto';
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/**
 * Middleware for handling conditional requests with ETags and Last-Modified headers
 * Implements HTTP 304 Not Modified responses for efficient caching
 */
@Injectable()
export class ConditionalRequestMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ConditionalRequestMiddleware.name);

  /**
   * Applies conditional request handling to responses
   * @param req - HTTP request
   * @param res - HTTP response
   * @param next - Next middleware function
   */
  use(req: Request, res: Response, next: NextFunction): void {
    // Only apply to GET and HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }

    // Store the original end method to intercept it
    const originalEnd = res.end;
    const originalWrite = res.write;
    const responseBody: Buffer[] = [];

    // Collect response data - using @ts-ignore to bypass complex type issues
    // @ts-ignore
    res.write = (...args: unknown[]): boolean => {
      const chunk = args[0];
      if (chunk) {
        responseBody.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      // @ts-ignore
      return originalWrite.apply(res, args);
    };

    // Handle the end of the response to add conditional headers
    // @ts-ignore
    res.end = function (...args: unknown[]): Response {
      const chunk = args[0];
      if (chunk) {
        responseBody.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }

      const completeBody = Buffer.concat(responseBody);

      try {
        // Skip if status is not 200 OK
        if (res.statusCode !== 200) {
          // @ts-ignore
          return originalEnd.apply(res, args);
        }

        // Add ETag header
        const hash = crypto.createHash('md5').update(completeBody).digest('hex');

        const etagValue = `W/"${hash}"`;

        res.setHeader('ETag', etagValue);

        // Check If-None-Match header
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch && ifNoneMatch === etagValue) {
          res.statusCode = 304;
          return originalEnd.apply(res, [null, 'utf-8']);
        }

        // Add Last-Modified header
        const lastModified = new Date().toUTCString();
        res.setHeader('Last-Modified', lastModified);

        // Check If-Modified-Since header
        const ifModifiedSince = req.headers['if-modified-since'];
        if (ifModifiedSince && ifModifiedSince === lastModified) {
          res.statusCode = 304;
          return originalEnd.apply(res, [null, 'utf-8']);
        }
      } catch (error) {
        this.logger.error(
          'Error in conditional request middleware',
          error instanceof Error ? error.stack : String(error)
        );
      }

      // @ts-ignore
      return originalEnd.apply(res, args);
    }.bind(this);

    next();
  }
}
