import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/**
 * Options for HTTP cache middleware
 */
export interface HttpCacheOptions {
  /** Default max age in seconds */
  maxAge?: number;
  /** Whether to include public directive */
  public?: boolean;
  /** Whether to include private directive */
  private?: boolean;
  /** Whether to include no-cache directive */
  noCache?: boolean;
  /** Whether to include no-store directive */
  noStore?: boolean;
  /** Whether to include must-revalidate directive */
  mustRevalidate?: boolean;
  /** Whether to include proxy-revalidate directive */
  proxyRevalidate?: boolean;
  /** Custom function to determine cache options based on request */
  getCacheOptions?: (req: Request) => Partial<HttpCacheOptions>;
}

/**
 * Middleware for setting HTTP cache headers
 * Improves performance by enabling browser and CDN caching
 */
@Injectable()
export class HttpCacheMiddleware implements NestMiddleware {
  private readonly logger = new Logger(HttpCacheMiddleware.name);
  private readonly options: HttpCacheOptions;

  constructor(options: HttpCacheOptions = {}) {
    this.options = {
      maxAge: 0,
      public: false,
      private: false,
      noCache: false,
      noStore: false,
      mustRevalidate: false,
      proxyRevalidate: false,
      ...options,
    };
  }

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

    // Get request-specific cache options if available
    let cacheOptions = this.options;
    if (this.options.getCacheOptions) {
      try {
        cacheOptions = {
          ...this.options,
          ...this.options.getCacheOptions(req),
        };
      } catch (error) {
        this.logger.error('Error in getCacheOptions', error instanceof Error ? error.stack : String(error));
      }
    }

    // Set cache control header based on options
    const directives: string[] = [];

    if (cacheOptions.public) directives.push('public');
    if (cacheOptions.private) directives.push('private');
    if (cacheOptions.noCache) directives.push('no-cache');
    if (cacheOptions.noStore) directives.push('no-store');
    if (cacheOptions.mustRevalidate) directives.push('must-revalidate');
    if (cacheOptions.proxyRevalidate) directives.push('proxy-revalidate');
    
    if (typeof cacheOptions.maxAge === 'number') {
      directives.push(`max-age=${cacheOptions.maxAge}`);
    }

    if (directives.length > 0) {
      res.setHeader('Cache-Control', directives.join(', '));
    }

    // If ETag support is needed, we could add it here

    next();
  }
} 