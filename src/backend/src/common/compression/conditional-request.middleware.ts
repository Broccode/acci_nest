import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import * as crypto from 'crypto';

/**
 * Options for conditional request middleware
 */
export interface ConditionalRequestOptions {
  /** Formats for the ETag of a response */
  etag?: boolean | 'weak' | 'strong';
  /** Whether to include Last-Modified headers */
  lastModified?: boolean;
}

/**
 * Middleware for handling conditional requests with ETags and Last-Modified headers
 * Implements HTTP 304 Not Modified responses for efficient caching
 */
@Injectable()
export class ConditionalRequestMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ConditionalRequestMiddleware.name);
  private readonly options: ConditionalRequestOptions;

  constructor(options: ConditionalRequestOptions = {}) {
    this.options = {
      etag: 'weak',
      lastModified: true,
      ...options,
    };
  }

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
    let responseBody: Buffer[] = [];

    // Collect response data
    res.write = function(chunk: any, ...args: any[]): boolean {
      if (chunk) {
        responseBody.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return originalWrite.apply(res, [chunk, ...args]);
    } as any;

    // Handle the end of the response to add conditional headers
    res.end = function(chunk: any, ...args: any): Response {
      if (chunk) {
        responseBody.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const completeBody = Buffer.concat(responseBody);
      
      try {
        // Skip if status is not 200 OK
        if (res.statusCode !== 200) {
          return originalEnd.apply(res, [chunk, ...args]);
        }

        // Add ETag header if enabled
        if (this.options.etag) {
          const hash = crypto.createHash('md5')
            .update(completeBody)
            .digest('hex');
          
          const etagValue = this.options.etag === 'weak' 
            ? `W/"${hash}"`
            : `"${hash}"`;
          
          res.setHeader('ETag', etagValue);
          
          // Check If-None-Match header
          const ifNoneMatch = req.headers['if-none-match'];
          if (ifNoneMatch && ifNoneMatch === etagValue) {
            res.statusCode = 304;
            return originalEnd.apply(res, [null, 'utf-8']);
          }
        }
        
        // Add Last-Modified header if enabled
        if (this.options.lastModified) {
          // Use current time as a last resort, but ideally this would be
          // set from a real resource modification time
          const lastModified = new Date().toUTCString();
          res.setHeader('Last-Modified', lastModified);
          
          // Check If-Modified-Since header
          const ifModifiedSince = req.headers['if-modified-since'];
          if (ifModifiedSince && ifModifiedSince === lastModified) {
            res.statusCode = 304;
            return originalEnd.apply(res, [null, 'utf-8']);
          }
        }
      } catch (error) {
        this.logger.error('Error in conditional request middleware', error instanceof Error ? error.stack : String(error));
      }

      return originalEnd.apply(res, [chunk, ...args]);
    }.bind(this) as any;

    next();
  }
} 