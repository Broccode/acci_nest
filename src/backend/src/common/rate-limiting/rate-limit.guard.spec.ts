import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TENANT_CONTEXT } from '../constants';
import {
  RATE_LIMIT_DURATION_KEY,
  RATE_LIMIT_KEY_PREFIX_KEY,
  RATE_LIMIT_POINTS_KEY,
} from './rate-limit.constants';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimiterService, RateLimitResult } from './rate-limiter.service';
import { TenantContext } from '../../tenants/services/tenant-context.service';
import { Reflector } from '@nestjs/core';

/**
 * @security OWASP:A4:2021 - Insecure Design
 * @security OWASP:A7:2021 - Identification and Authentication Failures
 * @evidence SOC2:Security - API protection against denial of service
 */
describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: Reflector;
  let rateLimiterService: any;
  let tenantContext: any;
  let context: any;

  const setupTest = async () => {
    // Arrange - Create simple mocks
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    rateLimiterService = {
      consume: jest.fn(),
    };

    tenantContext = {
      getCurrentTenant: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: RateLimitGuard,
          useFactory: () => new RateLimitGuard(reflector, rateLimiterService, tenantContext),
        },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);

    // Simple mock for ExecutionContext
    context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          ip: '192.168.1.1',
          user: { id: 'user-123' },
        }),
        getResponse: jest.fn().mockReturnValue({
          header: jest.fn(),
          status: jest.fn(),
        }),
      }),
    };
  };

  beforeEach(async () => {
    await setupTest();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should skip rate limiting if no points are configured', async () => {
    // Arrange
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

    // Act
    const result = await guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
    expect(rateLimiterService.consume).not.toHaveBeenCalled();
  });

  it('should allow requests when under the rate limit', async () => {
    // Arrange
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === RATE_LIMIT_POINTS_KEY) return 10;
      if (key === RATE_LIMIT_DURATION_KEY) return 60;
      if (key === RATE_LIMIT_KEY_PREFIX_KEY) return 'test:';
      return null;
    });

    jest.spyOn(tenantContext, 'getCurrentTenant').mockReturnValue('tenant-123');

    const mockResult = {
      remainingPoints: 9,
      isAllowed: true,
      resetTime: new Date(),
    };

    jest.spyOn(rateLimiterService, 'consume').mockResolvedValue(mockResult);

    // Act
    const result = await guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
    expect(rateLimiterService.consume).toHaveBeenCalled();
  });

  // Simplified test for error handling
  it('should handle errors gracefully', async () => {
    // Arrange
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(10);
    
    rateLimiterService.consume.mockImplementation(() => {
      throw new Error('Test error');
    });

    // Override the guard's error handling for the test
    // @ts-ignore - accessing private property
    guard['logger'] = { 
      error: jest.fn(), 
      warn: jest.fn() 
    };

    // Act
    const result = await guard.canActivate(context);

    // Assert
    expect(result).toBe(true); // Should fail open for service errors
  });
}); 