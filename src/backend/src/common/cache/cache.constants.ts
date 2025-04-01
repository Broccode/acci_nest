/**
 * Constants for caching functionality
 */

// Metadata keys for cache decorators
export const CACHE_TTL_METADATA = 'cache:ttl';
export const CACHE_TAGS_METADATA = 'cache:tags';
export const CACHE_KEY_GENERATOR_METADATA = 'cache:key_generator';

// Default values
export const DEFAULT_CACHE_TTL = 3600; // 1 hour
export const DEFAULT_CACHE_PREFIX = 'acci:'; 