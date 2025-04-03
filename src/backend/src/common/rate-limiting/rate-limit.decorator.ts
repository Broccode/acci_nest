import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import {
  RATE_LIMIT_DURATION_KEY,
  RATE_LIMIT_KEY_PREFIX_KEY,
  RATE_LIMIT_POINTS_KEY,
} from './rate-limit.constants';
import { RateLimitGuard } from './rate-limit.guard';

/**
 * Options for the RateLimit decorator
 */
export interface RateLimitOptions {
  /** Maximum number of requests allowed */
  points: number;
  /** Time window in seconds */
  duration?: number;
  /** Key prefix for Redis */
  keyPrefix?: string;
}

/**
 * Decorator for rate limiting at the method or class level
 * @param options - Rate limiting options
 */
export function RateLimit(options: RateLimitOptions) {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_POINTS_KEY, options.points),
    SetMetadata(RATE_LIMIT_DURATION_KEY, options.duration),
    SetMetadata(RATE_LIMIT_KEY_PREFIX_KEY, options.keyPrefix),
    UseGuards(RateLimitGuard)
  );
}
