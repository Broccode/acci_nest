// Mock the entire dependency chain
jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn().mockReturnValue('SetMetadata applied'),
  UseGuards: jest.fn().mockReturnValue('UseGuards applied'),
  applyDecorators: jest.fn((...decorators) => decorators),
  Scope: {
    REQUEST: 'REQUEST',
    DEFAULT: 'DEFAULT',
    TRANSIENT: 'TRANSIENT'
  },
  Inject: jest.fn().mockReturnValue(() => {}),
  Injectable: jest.fn().mockReturnValue(() => {}),
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn()
  }))
}));

// Mock for @nestjs/core
jest.mock('@nestjs/core', () => ({
  Reflector: jest.fn().mockImplementation(() => ({
    getAllAndOverride: jest.fn()
  }))
}));

// Mock RateLimitGuard to prevent dependency imports
jest.mock('./rate-limit.guard', () => ({
  RateLimitGuard: class MockRateLimitGuard {}
}));

// Mock RateLimiterService
jest.mock('./rate-limiter.service', () => ({
  RateLimiterService: class MockRateLimiterService {}
}));

// Mock Redis and REDIS_CLIENT
jest.mock('ioredis', () => ({
  Redis: class MockRedis {}
}));

jest.mock('../constants', () => ({
  REDIS_CLIENT: 'REDIS_CLIENT',
  TENANT_CONTEXT: 'TENANT_CONTEXT'
}));

// Import after mocking
import { SetMetadata, UseGuards } from '@nestjs/common';
import { RateLimit, RateLimitOptions } from './rate-limit.decorator';
import {
  RATE_LIMIT_DURATION_KEY,
  RATE_LIMIT_KEY_PREFIX_KEY,
  RATE_LIMIT_POINTS_KEY,
} from './rate-limit.constants';
import { RateLimitGuard } from './rate-limit.guard';

/**
 * @security OWASP:A4:2021 - Insecure Design
 * @evidence SOC2:Security - Rate limiting controls implementation
 */
describe('RateLimit Decorator', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  /**
   * @security OWASP:A7:2021 - Identification and Authentication Failures
   */
  it('should apply all required metadata decorators', () => {
    // Arrange
    const options: RateLimitOptions = {
      points: 100,
      duration: 60,
      keyPrefix: 'test:',
    };

    // Act
    const decorators = RateLimit(options);

    // Assert
    expect(SetMetadata).toHaveBeenCalledTimes(3);
    expect(SetMetadata).toHaveBeenCalledWith(RATE_LIMIT_POINTS_KEY, 100);
    expect(SetMetadata).toHaveBeenCalledWith(RATE_LIMIT_DURATION_KEY, 60);
    expect(SetMetadata).toHaveBeenCalledWith(RATE_LIMIT_KEY_PREFIX_KEY, 'test:');
    expect(UseGuards).toHaveBeenCalledWith(RateLimitGuard);
  });

  /**
   * @security OWASP:A5:2021 - Security Misconfiguration
   */
  it('should handle minimal options with just points', () => {
    // Arrange
    const options: RateLimitOptions = {
      points: 50,
    };

    // Act
    const decorators = RateLimit(options);

    // Assert
    expect(SetMetadata).toHaveBeenCalledWith(RATE_LIMIT_POINTS_KEY, 50);
    expect(SetMetadata).toHaveBeenCalledWith(RATE_LIMIT_DURATION_KEY, undefined);
    expect(SetMetadata).toHaveBeenCalledWith(RATE_LIMIT_KEY_PREFIX_KEY, undefined);
    expect(UseGuards).toHaveBeenCalledWith(RateLimitGuard);
  });

  /**
   * @security OWASP:A7:2021 - Identification and Authentication Failures
   */
  it('should always apply RateLimitGuard', () => {
    // Arrange
    const options: RateLimitOptions = {
      points: 10,
    };

    // Act
    const decorators = RateLimit(options);

    // Assert
    expect(UseGuards).toHaveBeenCalledWith(RateLimitGuard);
  });
}); 

// Mock TenantContext
jest.mock('../../tenants/services/tenant-context.service', () => ({
  TenantContext: jest.fn().mockImplementation(() => ({
    getCurrentTenant: jest.fn().mockReturnValue('test-tenant')
  }))
}));