import { Test, TestingModule } from '@nestjs/testing';
import { REDIS_CLIENT } from '../constants';
import { RateLimiterService, RateLimitResult } from './rate-limiter.service';
import { RedisMock } from '../redis/redis-mock.provider';

/**
 * @security OWASP:A4:2021 - Insecure Design
 * @security OWASP:A6:2021 - Vulnerable and Outdated Components
 * @evidence SOC2:Security - Rate limiting as protection against brute force attacks
 */
describe('RateLimiterService', () => {
  let service: RateLimiterService;
  let redisMock: RedisMock;

  beforeEach(async () => {
    // Arrange - Use the full Redis mock implementation
    redisMock = new RedisMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimiterService,
        {
          provide: REDIS_CLIENT,
          useValue: redisMock,
        },
      ],
    }).compile();

    service = module.get<RateLimiterService>(RateLimiterService);
  });

  it('should be defined', () => {
    // Assert
    expect(service).toBeDefined();
  });

  /**
   * @security OWASP:A7:2021 - Identification and Authentication Failures
   */
  it('should allow requests when under the rate limit', async () => {
    // Arrange
    const key = 'test-user-123';
    const options = { points: 10, duration: 60 };
    
    // Spy on Redis eval to verify call
    const evalSpy = jest.spyOn(redisMock, 'eval');
    
    // Act
    const result = await service.consume(key, options);
    
    // Assert
    expect(evalSpy).toHaveBeenCalled();
    expect(result.isAllowed).toBe(true);
    expect(result.remainingPoints).toBeGreaterThanOrEqual(0);
    expect(result.resetTime).toBeInstanceOf(Date);
    expect(result.resetTime.getTime()).toBeGreaterThan(Date.now());
  });

  /**
   * @security OWASP:A7:2021 - Identification and Authentication Failures
   */
  it('should block requests when over the rate limit', async () => {
    // Arrange
    const key = 'test-user-123';
    const options = { points: 2, duration: 60 };
    
    // Override the eval implementation to simulate rate limit behavior more accurately
    jest.spyOn(redisMock, 'eval').mockImplementation(async (script, numKeys, ...args) => {
      if (script.includes('ZREMRANGEBYSCORE') && script.includes('ZCARD')) {
        // Force a negative remaining points to simulate over limit
        const now = Date.now();
        return ['-1', (now + 60000).toString()];
      }
      return ['0', String(Date.now() + 60000)];
    });
    
    // Act
    const result = await service.consume(key, options);
    
    // Assert
    expect(result.isAllowed).toBe(false);
    expect(result.remainingPoints).toBeLessThan(0);
    expect(result.resetTime.getTime()).toBeGreaterThan(Date.now());
  });

  /**
   * @security OWASP:A4:2021 - Insecure Design
   */
  it('should handle Redis errors safely and fail closed', async () => {
    // Arrange
    const key = 'test-user-123';
    const options = { points: 10, duration: 60 };
    
    // Mock Redis throwing an error
    jest.spyOn(redisMock, 'eval').mockRejectedValue(new Error('Redis connection error'));
    
    // Act
    const result = await service.consume(key, options);
    
    // Assert - Should fail closed (deny request) for security
    expect(result.isAllowed).toBe(false);
    expect(result.remainingPoints).toBe(0);
    expect(result.resetTime).toBeInstanceOf(Date);
  });

  /**
   * @security OWASP:A10:2021 - Server-Side Request Forgery
   */
  it('should handle empty keys safely', async () => {
    // Arrange
    const key = '';
    const options = { points: 10, duration: 60 };
    
    // Spy on Redis eval to verify it's not called
    const evalSpy = jest.spyOn(redisMock, 'eval');
    
    // Act
    const result = await service.consume(key, options);
    
    // Assert - Should not call Redis with empty key
    expect(evalSpy).not.toHaveBeenCalled();
    expect(result.isAllowed).toBe(false);
  });

  /**
   * @security OWASP:A3:2021 - Injection
   */
  it('should sanitize and use proper key prefixes', async () => {
    // Arrange
    const key = 'user:123';
    const options = { points: 10, duration: 60, keyPrefix: 'custom-prefix:' };
    
    // Spy on Redis eval to capture arguments
    const evalSpy = jest.spyOn(redisMock, 'eval');
    
    // Act
    await service.consume(key, options);
    
    // Assert - Check if proper key prefix is used
    expect(evalSpy).toHaveBeenCalled();
    const evalArgs = evalSpy.mock.calls[0];
    
    // The second argument is the number of keys (1)
    // The third argument should be the key with prefix
    expect(evalArgs[2]).toEqual('custom-prefix:user:123');
  });

  /**
   * @security OWASP:A7:2021 - Identification and Authentication Failures
   */
  it('should use default values when optional parameters are not provided', async () => {
    // Arrange
    const key = 'test-user-123';
    const options = { points: 10, duration: 60 }; // No keyPrefix
    
    // Spy on Redis eval to capture arguments
    const evalSpy = jest.spyOn(redisMock, 'eval');
    
    // Act
    await service.consume(key, options);
    
    // Assert - Check if default key prefix is used
    expect(evalSpy).toHaveBeenCalled();
    const evalArgs = evalSpy.mock.calls[0];
    
    // The second argument is the number of keys (1)
    // The third argument should be the key with default prefix
    expect(evalArgs[2]).toEqual('rate-limit:test-user-123');
  });
}); 