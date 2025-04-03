import { Inject, Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { TenantContext } from '../../tenants/services/tenant-context.service';
import { REDIS_CLIENT, TENANT_CONTEXT } from '../constants';
import { CacheOptions, CacheService } from './cache.interface';

/**
 * Redis implementation of the CacheService interface
 * Provides caching functionality with multi-tenancy support
 */
@Injectable()
export class RedisCacheService implements CacheService {
  private readonly logger = new Logger(RedisCacheService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(TENANT_CONTEXT) private readonly tenantContext: TenantContext
  ) {}

  /**
   * Builds a cache key with tenant awareness
   * @param key - Base cache key
   * @param options - Cache options that may include tenant ID
   * @returns Full cache key with tenant prefix if applicable
   */
  private buildKey(key: string, options?: CacheOptions): string {
    const tenant =
      options?.tenant ||
      (this.tenantContext.hasTenant() ? this.tenantContext.getCurrentTenant() : null);
    return tenant ? `tenant:${tenant}:${key}` : key;
  }

  /**
   * Associates tags with a cache key for later invalidation
   * @param key - Cache key to tag
   * @param tags - Tags to associate with key
   * @param tenant - Optional tenant ID
   */
  private async setTagsForKey(key: string, tags: string[], tenant?: string): Promise<void> {
    if (!tags || tags.length === 0) return;

    try {
      const pipeline = this.redis.pipeline();
      for (const tag of tags) {
        const tagKey = tenant ? `tag:${tenant}:${tag}` : `tag:${tag}`;
        pipeline.sadd(tagKey, key);
      }
      await pipeline.exec();
    } catch (error) {
      this.logger.error(
        `Failed to set tags for key ${key}`,
        error instanceof Error ? error.stack : String(error)
      );
      // Continue execution - non-critical operation
    }
  }

  /**
   * Retrieves data from cache
   * @param key - Cache key to retrieve
   * @param options - Optional cache operation parameters
   * @returns The cached value or null if not found or on error
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const fullKey = this.buildKey(key, options);

    try {
      const data = await this.redis.get(fullKey);
      if (!data) return null;

      return JSON.parse(data) as T;
    } catch (error) {
      this.logger.error(
        `Failed to get from cache: ${fullKey}`,
        error instanceof Error ? error.stack : String(error)
      );
      return null; // Fail safely - return null as if cache miss
    }
  }

  /**
   * Stores data in cache
   * @param key - Cache key to store
   * @param value - Value to cache
   * @param options - Optional cache operation parameters
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const fullKey = this.buildKey(key, options);
    const ttl = options?.ttl || 3600; // Default 1 hour

    try {
      // Serialize value to store
      const serialized = JSON.stringify(value);

      // Set with expiration
      await this.redis.set(fullKey, serialized, 'EX', ttl);

      // Set tags if provided
      if (options?.tags && options.tags.length > 0) {
        await this.setTagsForKey(fullKey, options.tags, options?.tenant);
      }
    } catch (error) {
      this.logger.error(
        `Failed to store in cache: ${fullKey}`,
        error instanceof Error ? error.stack : String(error)
      );
      // Continue execution - application should work without caching
    }
  }

  /**
   * Removes data from cache
   * @param key - Cache key to delete
   * @param options - Optional cache operation parameters
   */
  async delete(key: string, options?: CacheOptions): Promise<void> {
    const fullKey = this.buildKey(key, options);

    try {
      await this.redis.del(fullKey);
    } catch (error) {
      this.logger.error(
        `Failed to delete from cache: ${fullKey}`,
        error instanceof Error ? error.stack : String(error)
      );
      // Continue execution - application should work without cache deletion
    }
  }

  /**
   * Removes cache entries by tags
   * @param tags - Tags to match for deletion
   * @param tenant - Optional tenant ID for multi-tenancy
   */
  async deleteByTags(tags: string[], tenant?: string): Promise<void> {
    if (!tags || tags.length === 0) return;

    try {
      const pipeline = this.redis.pipeline();
      const keysToDelete = new Set<string>();

      // For each tag, get all associated keys
      for (const tag of tags) {
        const tagKey = tenant ? `tag:${tenant}:${tag}` : `tag:${tag}`;

        // Get all keys for this tag
        const keys = await this.redis.smembers(tagKey);
        keys.forEach((key) => keysToDelete.add(key));

        // Delete the tag set itself
        pipeline.del(tagKey);
      }

      // Delete all the keys
      if (keysToDelete.size > 0) {
        pipeline.del(...Array.from(keysToDelete));
      }

      await pipeline.exec();
    } catch (error) {
      this.logger.error(
        `Failed to delete by tags: ${tags.join(', ')}`,
        error instanceof Error ? error.stack : String(error)
      );
      // Continue execution - application should work without proper cache invalidation
    }
  }

  /**
   * Removes all cache entries for a tenant
   * Uses scan to handle large key sets efficiently
   * @param tenant - Tenant ID
   */
  async deleteByTenant(tenant: string): Promise<void> {
    if (!tenant) {
      this.logger.warn('Attempted to delete cache by tenant with empty tenant ID');
      return;
    }

    try {
      let cursor = '0';
      let keysCount = 0;

      do {
        // Scan for keys in batches to avoid blocking Redis
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          `tenant:${tenant}:*`,
          'COUNT',
          '100'
        );

        cursor = nextCursor;
        keysCount += keys.length;

        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } while (cursor !== '0');

      this.logger.debug(`Deleted ${keysCount} cache entries for tenant ${tenant}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete cache by tenant ${tenant}`,
        error instanceof Error ? error.stack : String(error)
      );
      // Continue execution - application should work without proper cache invalidation
    }
  }

  /**
   * Clears the entire cache
   * Use with caution - flushes the entire Redis database
   */
  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.logger.warn('Cache completely cleared');
    } catch (error) {
      this.logger.error(
        'Failed to clear cache',
        error instanceof Error ? error.stack : String(error)
      );
      // Continue execution - application should work without cache clearing
    }
  }
}
