import { Injectable, Logger, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../constants';

/**
 * Options for rate limiting
 */
export interface RateLimitOptions {
  /** Maximum number of requests allowed */
  points: number;
  /** Time window in seconds */
  duration: number;
  /** Key prefix for Redis */
  keyPrefix?: string;
}

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  /** Remaining allowed requests */
  remainingPoints: number;
  /** Whether the request is allowed */
  isAllowed: boolean;
  /** When the rate limit resets */
  resetTime: Date;
}

/**
 * Service for implementing rate limiting using Redis
 */
@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}
  
  /**
   * Lua script for atomic rate limiting
   * Ensures thread-safe rate limiting operations
   */
  private readonly rateLimitScript = `
    local key = KEYS[1]
    local points = tonumber(ARGV[1])
    local duration = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    
    -- Clean old records outside the time window
    redis.call('ZREMRANGEBYSCORE', key, 0, now - duration * 1000)
    
    -- Count current requests in the time window
    local count = redis.call('ZCARD', key)
    
    -- Check if rate limit is exceeded
    local allowed = count < points
    
    -- Add current request timestamp if allowed
    if allowed then
      redis.call('ZADD', key, now, now)
    end
    
    -- Set expiration for the whole key
    redis.call('EXPIRE', key, duration)
    
    -- Return remaining points and reset time
    return {tostring(points - count - (allowed and 1 or 0)), tostring(now + duration * 1000)}
  `;
  
  /**
   * Checks if a request is allowed based on rate limiting rules
   * @param key - Unique identifier for the rate limit (e.g., IP, userId)
   * @param options - Rate limiting options
   * @returns Rate limit check result
   */
  async consume(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    if (!key) {
      this.logger.warn('Attempted to check rate limit with empty key');
      return { remainingPoints: 0, isAllowed: false, resetTime: new Date() };
    }
    
    try {
      const { points, duration, keyPrefix = 'rate-limit:' } = options;
      const redisKey = `${keyPrefix}${key}`;
      const now = Date.now();
      
      const [remainingPointsResult, resetTimeResult]: [string, string] = await this.redis.eval(
        this.rateLimitScript,
        1, // number of keys
        redisKey,
        String(points),
        String(duration),
        String(now)
      ) as [string, string];
      
      const remainingPoints = parseInt(remainingPointsResult, 10);
      const resetTime = new Date(parseInt(resetTimeResult, 10));
      
      return {
        remainingPoints,
        isAllowed: remainingPoints >= 0,
        resetTime
      };
    } catch (error) {
      this.logger.error(`Rate limiting error for key ${key}`, error instanceof Error ? error.stack : String(error));
      
      // Fail open or fail closed based on security requirements
      // Here we fail closed (deny request) to be more secure
      return {
        remainingPoints: 0,
        isAllowed: false,
        resetTime: new Date(Date.now() + 60000) // Default 1 minute reset
      };
    }
  }
} 