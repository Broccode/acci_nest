import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Observable, of } from 'rxjs';
import { CacheableInterceptor } from './cacheable.interceptor';
import { RedisCacheService } from './redis-cache.service';
import { TenantContext } from '../../tenants/services/tenant-context.service';
import { TENANT_CONTEXT } from '../constants';
import { CACHE_TTL_METADATA, CACHE_TAGS_METADATA } from './cache.constants';

describe('CacheableInterceptor', () => {
  let interceptor: CacheableInterceptor;
  let cacheService: RedisCacheService;
  let reflector: Reflector;
  let tenantContext: TenantContext;

  const mockCallHandler: CallHandler = {
    handle: () => of({ data: 'test data' }),
  };

  const mockExecutionContext = {
    getHandler: jest.fn(() => ({ name: 'testMethod' })),
    getClass: jest.fn(() => ({ name: 'TestController' })),
    getType: jest.fn(() => 'http'),
    getArgByIndex: jest.fn(() => ({ id: '123' })),
    switchToHttp: jest.fn(() => ({
      getRequest: jest.fn(() => ({ method: 'GET' })),
    })),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheableInterceptor,
        {
          provide: RedisCacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: TENANT_CONTEXT,
          useValue: {
            hasTenant: jest.fn(),
            getCurrentTenant: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<CacheableInterceptor>(CacheableInterceptor);
    cacheService = module.get<RedisCacheService>(RedisCacheService);
    reflector = module.get<Reflector>(Reflector);
    tenantContext = module.get<TenantContext>(TENANT_CONTEXT);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should skip caching when TTL is not set', async () => {
    // Arrange
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === CACHE_TTL_METADATA) return undefined;
      return undefined;
    });

    // Act
    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
    const result = await result$.toPromise();

    // Assert
    expect(result).toEqual({ data: 'test data' });
    expect(cacheService.get).not.toHaveBeenCalled();
    expect(cacheService.set).not.toHaveBeenCalled();
  });

  it('should skip caching for non-GET requests', async () => {
    // Arrange
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === CACHE_TTL_METADATA) return 60;
      if (key === CACHE_TAGS_METADATA) return ['test'];
      return undefined;
    });

    const nonGetContext = {
      ...mockExecutionContext,
      switchToHttp: jest.fn(() => ({
        getRequest: jest.fn(() => ({ method: 'POST' })),
      })),
    } as unknown as ExecutionContext;

    // Act
    const result$ = interceptor.intercept(nonGetContext, mockCallHandler);
    const result = await result$.toPromise();

    // Assert
    expect(result).toEqual({ data: 'test data' });
    expect(cacheService.get).not.toHaveBeenCalled();
    expect(cacheService.set).not.toHaveBeenCalled();
  });

  it('should return cached value when available', async () => {
    // Arrange
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === CACHE_TTL_METADATA) return 60;
      if (key === CACHE_TAGS_METADATA) return ['test'];
      return undefined;
    });

    jest.spyOn(tenantContext, 'hasTenant').mockReturnValue(true);
    jest.spyOn(tenantContext, 'getCurrentTenant').mockReturnValue('tenant1');
    
    const cachedData = { data: 'cached data' };
    jest.spyOn(cacheService, 'get').mockResolvedValue(cachedData);

    // Act
    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
    const result = await result$.toPromise();

    // Assert
    expect(result).toEqual(cachedData);
    expect(cacheService.get).toHaveBeenCalledWith(
      'TestController:testMethod:{"id":"123"}',
      expect.objectContaining({
        ttl: 60,
        tags: ['test'],
        tenant: 'tenant1',
      })
    );
    expect(cacheService.set).not.toHaveBeenCalled();
  });

  it('should cache method result when not in cache', async () => {
    // Arrange
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === CACHE_TTL_METADATA) return 60;
      if (key === CACHE_TAGS_METADATA) return ['test'];
      return undefined;
    });

    jest.spyOn(tenantContext, 'hasTenant').mockReturnValue(true);
    jest.spyOn(tenantContext, 'getCurrentTenant').mockReturnValue('tenant1');
    
    // Cache miss
    jest.spyOn(cacheService, 'get').mockResolvedValue(null);
    
    // Method result
    const methodResult = { data: 'fresh data' };
    const mockHandler = {
      handle: () => of(methodResult),
    };

    // Act
    const result$ = interceptor.intercept(mockExecutionContext, mockHandler);
    const result = await result$.toPromise();

    // Assert
    expect(result).toEqual(methodResult);
    expect(cacheService.get).toHaveBeenCalled();
    expect(cacheService.set).toHaveBeenCalledWith(
      'TestController:testMethod:{"id":"123"}',
      methodResult,
      expect.objectContaining({
        ttl: 60,
        tags: ['test'],
        tenant: 'tenant1',
      })
    );
  });

  it('should handle errors when retrieving from cache', async () => {
    // Arrange
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === CACHE_TTL_METADATA) return 60;
      return undefined;
    });

    // Simulate cache error
    jest.spyOn(cacheService, 'get').mockRejectedValue(new Error('Cache error'));
    
    // Act
    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
    const result = await result$.toPromise();

    // Assert
    expect(result).toEqual({ data: 'test data' });
    expect(cacheService.get).toHaveBeenCalled();
    expect(cacheService.set).toHaveBeenCalled();
  });

  it('should handle errors when storing in cache', async () => {
    // Arrange
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === CACHE_TTL_METADATA) return 60;
      return undefined;
    });

    // Cache miss
    jest.spyOn(cacheService, 'get').mockResolvedValue(null);
    
    // Simulate cache set error
    jest.spyOn(cacheService, 'set').mockRejectedValue(new Error('Cache set error'));
    
    // Act
    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
    const result = await result$.toPromise();

    // Assert - execution completes despite cache error
    expect(result).toEqual({ data: 'test data' });
    expect(cacheService.get).toHaveBeenCalled();
    expect(cacheService.set).toHaveBeenCalled();
  });

  it('should properly generate cache key with non-object arguments', async () => {
    // Arrange
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === CACHE_TTL_METADATA) return 60;
      return undefined;
    });

    const stringArgContext = {
      ...mockExecutionContext,
      getArgByIndex: jest.fn(() => 'string-arg'),
    } as unknown as ExecutionContext;
    
    // Act
    await interceptor.intercept(stringArgContext, mockCallHandler).toPromise();

    // Assert
    expect(cacheService.get).toHaveBeenCalledWith(
      'TestController:testMethod:string-arg',
      expect.anything()
    );
  });
}); 