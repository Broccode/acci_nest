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
      return next();
    }

    // Store the original end method to intercept it
    const originalEnd = res.end;
    const originalWrite = res.write;
    const responseBody: Buffer[] = [];

    // Collect response data
    res.write = (chunk: any, ...args: any[]): boolean => {
      if (chunk) {
        responseBody.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return originalWrite.apply(res, [chunk, ...args]);
    } as any;

    // Handle the end of the response to add conditional headers
    res.end = function (chunk: any, ...args: any): Response {
      if (chunk) {
        responseBody.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const completeBody = Buffer.concat(responseBody);

      try {
        // Skip if status is not 200 OK
        if (res.statusCode !== 200) {
          return originalEnd.apply(res, [chunk, ...args]);
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

      return originalEnd.apply(res, [chunk, ...args]);
    }.bind(this) as any;

    next();
  }
}
