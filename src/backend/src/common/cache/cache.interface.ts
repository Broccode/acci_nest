/**
 * Options for cache operations
 */
export interface CacheOptions {
  /** Time-to-live in seconds */
  ttl?: number;
  /** Tags for grouping cache entries */
  tags?: string[];
  /** Tenant ID for multi-tenancy support */
  tenant?: string;
}

/**
 * Core caching service interface
 * Provides methods for interacting with the cache system
 */
export interface CacheService {
  /**
   * Retrieves data from cache
   * @param key - Cache key to retrieve
   * @param options - Optional cache operation parameters
   * @returns The cached value or null if not found
   */
  get<T>(key: string, options?: CacheOptions): Promise<T | null>;
  
  /**
   * Stores data in cache
   * @param key - Cache key to store
   * @param value - Value to cache
   * @param options - Optional cache operation parameters
   */
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  
  /**
   * Removes data from cache
   * @param key - Cache key to delete
   * @param options - Optional cache operation parameters
   */
  delete(key: string, options?: CacheOptions): Promise<void>;
  
  /**
   * Removes cache entries by tags
   * @param tags - Tags to match for deletion
   * @param tenant - Optional tenant ID for multi-tenancy
   */
  deleteByTags(tags: string[], tenant?: string): Promise<void>;
  
  /**
   * Removes all cache entries for a tenant
   * @param tenant - Tenant ID
   */
  deleteByTenant(tenant: string): Promise<void>;
  
  /**
   * Clears the entire cache
   */
  clear(): Promise<void>;
} 