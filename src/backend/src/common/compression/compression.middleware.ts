import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import compression from 'compression';
import { NextFunction, Request, Response } from 'express';

/**
 * Options for compression middleware
 */
export interface CompressionOptions {
  /** Compression level (0-9, where 0 is no compression and 9 is max compression) */
  level?: number;
  /** Threshold size in bytes to compress responses (responses smaller than this won't be compressed) */
  threshold?: number;
  /** Response types to compress */
  filter?: (req: Request, res: Response) => boolean;
}

/**
 * Middleware for compressing HTTP responses
 * Reduces bandwidth usage and improves performance for clients
 */
@Injectable()
export class CompressionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CompressionMiddleware.name);
  private readonly compressionMiddleware: any;

  constructor(options: CompressionOptions = {}) {
    const {
      level = 6,
      threshold = 1024, // Default: compress responses larger than 1KB
      filter = this.shouldCompress,
    } = options;

    try {
      this.compressionMiddleware = compression({
        level,
        threshold,
        filter,
      });
    } catch (error) {
      this.logger.error('Failed to initialize compression middleware', error instanceof Error ? error.stack : String(error));
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

  /**
   * Determines if a response should be compressed
   * @param req - HTTP request
   * @param res - HTTP response
   * @returns Whether the response should be compressed
   */
  private shouldCompress(req: Request, res: Response): boolean {
    // Skip compression for IE6 (known issues)
    if (req.headers['user-agent']?.includes('MSIE 6')) {
      return false;
    }

    // Skip compression for binary or already compressed content types
    const contentType = res.getHeader('Content-Type') as string | undefined;
    if (contentType) {
      if (
        contentType.includes('image/') ||
        contentType.includes('video/') ||
        contentType.includes('audio/') ||
        contentType.includes('application/zip') ||
        contentType.includes('application/x-gzip') ||
        contentType.includes('application/pdf')
      ) {
        return false;
      }
    }

    // Default compression filter from compression middleware
    return compression.filter(req, res);
  }
} 