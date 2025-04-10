import { EventEmitter } from 'events';
import { Provider } from '@nestjs/common';
import { REDIS_CLIENT } from '../constants';

/**
 * Redis mock implementation for testing
 * Provides in-memory functionality for unit tests
 *
 * @security OWASP:A7:2021 - Identification and Authentication Failures
 * @evidence SOC2:Security - Testing security controls without external dependencies
 */
export class RedisMock extends EventEmitter {
  private storage = new Map<string, string>();
  private sets = new Map<string, Map<string, number>>();
  private zsets = new Map<string, Map<string, number>>();
  private expirations = new Map<string, number>();
  status = 'ready';

  // Basic key operations
  async get(key: string): Promise<string | null> {
    this.checkExpiration(key);
    return this.storage.get(key) || null;
  }

  async set(key: string, value: string, ...args: string[]): Promise<'OK'> {
    this.storage.set(key, value);
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.storage.delete(key)) deleted++;
      if (this.sets.delete(key)) deleted++;
      if (this.zsets.delete(key)) deleted++;
      this.expirations.delete(key);
    }
    return deleted;
  }

  // Expiration
  async expire(key: string, seconds: number): Promise<number> {
    if (!this.exists(key)) return 0;
    this.expirations.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Map());
    }
    const set = this.sets.get(key);
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.set(member, 1);
        added++;
      }
    }
    return added;
  }

  // Sorted set operations
  async zadd(key: string, score: number, member: string, ...args: string[]): Promise<number> {
    if (!this.zsets.has(key)) {
      this.zsets.set(key, new Map());
    }
    const zset = this.zsets.get(key);
    zset.set(member, score);
    return 1;
  }

  async zcard(key: string): Promise<number> {
    return this.zsets.has(key) ? this.zsets.get(key).size : 0;
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    if (!this.zsets.has(key)) return 0;
    const zset = this.zsets.get(key);
    let deleted = 0;
    for (const [member, score] of zset.entries()) {
      if (score >= min && score <= max) {
        zset.delete(member);
        deleted++;
      }
    }
    return deleted;
  }

  // Mock the eval command to support rate limiting script
  async eval(
    script: string,
    numKeys: number,
    ...args: string[]
  ): Promise<Array<string> | string | number> {
    // For rate limiting script specifically
    if (
      script.includes('ZREMRANGEBYSCORE') &&
      script.includes('ZCARD') &&
      script.includes('ZADD')
    ) {
      const key = args[0];
      const points = parseInt(args[1], 10);
      const duration = parseInt(args[2], 10);
      const now = parseInt(args[3], 10);

      // Simulate script operation
      this.zremrangebyscore(key, 0, now - duration * 1000);
      const count = await this.zcard(key);
      const allowed = count < points;

      if (allowed) {
        await this.zadd(key, now, String(now));
      }

      await this.expire(key, duration);

      // Return remaining points and reset time
      return [String(points - count - (allowed ? 1 : 0)), String(now + duration * 1000)];
    }

    // Default fallback for other eval commands
    return ['0', String(Date.now() + 60000)];
  }

  // Helper methods
  exists(key: string): boolean {
    this.checkExpiration(key);
    return this.storage.has(key) || this.sets.has(key) || this.zsets.has(key);
  }

  private checkExpiration(key: string): void {
    const expiry = this.expirations.get(key);
    if (expiry && expiry < Date.now()) {
      this.storage.delete(key);
      this.sets.delete(key);
      this.zsets.delete(key);
      this.expirations.delete(key);
    }
  }

  // Connection management (mocked)
  async connect(): Promise<void> {
    this.status = 'ready';
    this.emit('connect');
    return Promise.resolve();
  }

  async disconnect(): Promise<void> {
    this.status = 'end';
    this.emit('end');
    return Promise.resolve();
  }

  async quit(): Promise<'OK'> {
    await this.disconnect();
    return 'OK';
  }
}

/**
 * Factory for creating Redis mock instances
 * @returns A mock Redis client for testing
 */
export const createMockRedisClient = () => {
  return new RedisMock();
};

/**
 * Redis mock provider for dependency injection in test modules
 */
export const RedisMockProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: createMockRedisClient,
};
