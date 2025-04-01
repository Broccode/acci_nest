import { SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';
import { CACHE_TTL_METADATA, CACHE_TAGS_METADATA, DEFAULT_CACHE_TTL } from './cache.constants';
import { CacheableInterceptor } from './cacheable.interceptor';

/**
 * Options for the Cacheable decorator
 */
export interface CacheableOptions {
  /** Time-to-live in seconds */
  ttl?: number;
  /** Tags for grouping cache entries */
  tags?: string[];
}

/**
 * Decorator for method-level caching
 * Marks a method for caching its results based on parameters
 * @param options - Caching options
 */
export function Cacheable(options: CacheableOptions = {}) {
  return applyDecorators(
    SetMetadata(CACHE_TTL_METADATA, options.ttl || DEFAULT_CACHE_TTL),
    SetMetadata(CACHE_TAGS_METADATA, options.tags || []),
    UseInterceptors(CacheableInterceptor)
  );
} 