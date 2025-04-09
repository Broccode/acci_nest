import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, Type } from '@nestjs/common';
import { CacheableInterceptor } from '../cacheable.interceptor';
import { RedisCacheService } from '../redis-cache.service';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { CACHE_TTL_METADATA, CACHE_TAGS_METADATA } from '../cache.constants';
import { TENANT_CONTEXT } from '../../../common/constants';
import { TenantContext } from '../../../tenants/services/tenant-context.service';

describe('CacheableInterceptor', () => {
  let interceptor: CacheableInterceptor;
  let cacheService: jest.Mocked<RedisCacheService>;
  let reflector: jest.Mocked<Reflector>;
  let tenantContext: jest.Mocked<TenantContext>;
  const mockTenantId = 'test-tenant';

  const createMockExecutionContext = (): ExecutionContext => {
    const mockHandler = function testMethod() {};
    const mockClass = class TestClass {};
    
    return {
      getHandler: () => mockHandler,
      getClass: () => mockClass as Type<unknown>,
      getArgByIndex: () => undefined,
      getArgs: () => [],
      switchToRpc: () => ({ getContext: () => ({}), getData: () => ({}) }),
      switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => ({}), getNext: () => ({}) }),
      switchToWs: () => ({ 
        getClient: () => ({}), 
        getData: () => ({}),
        getPattern: () => ''
      }),
      getType: () => 'http'
    } as ExecutionContext;
  };

  beforeEach(async () => {
    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      buildKey: jest.fn(key => key),
    } as any;

    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    tenantContext = {
      getCurrentTenant: jest.fn(() => mockTenantId),
      hasTenant: jest.fn(() => true),
    } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        CacheableInterceptor,
        {
          provide: RedisCacheService,
          useValue: cacheService,
        },
        {
          provide: Reflector,
          useValue: reflector,
        },
        {
          provide: TENANT_CONTEXT,
          useValue: tenantContext,
        },
      ],
    }).compile();

    interceptor = moduleRef.get<CacheableInterceptor>(CacheableInterceptor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createExecutionContext = (): ExecutionContext => ({
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        url: '/test',
        method: 'GET',
        params: {},
        query: {},
        body: {},
      }),
    }),
    getHandler: jest.fn().mockReturnValue({
      name: 'testMethod'
    }),
    getClass: jest.fn().mockReturnValue({
      name: 'TestClass'
    }),
    getType: jest.fn(),
    getArgs: jest.fn().mockReturnValue([]),
    getArgByIndex: jest.fn().mockReturnValue({}),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
  });

  const createCallHandler = (response: any = { data: 'test' }): CallHandler => ({
    handle: jest.fn().mockReturnValue(of(response)),
  });

  describe('intercept', () => {
    it('should return cached data when available', async () => {
      // Arrange
      const context = createExecutionContext();
      const next = createCallHandler();
      const cachedData = { data: 'cached' };
      
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === CACHE_TTL_METADATA) return 3600;
        if (key === CACHE_TAGS_METADATA) return ['test-tag'];
        return undefined;
      });
      
      cacheService.get.mockResolvedValue(cachedData);

      // Act
      const result$ = interceptor.intercept(context, next);
      const result = await result$.toPromise();

      // Assert
      expect(result).toEqual(cachedData);
      expect(cacheService.get).toHaveBeenCalledWith(
        'TestClass:testMethod:{}',
        expect.objectContaining({
          ttl: 3600,
          tags: ['test-tag'],
          tenant: mockTenantId,
        })
      );
      expect(next.handle).not.toHaveBeenCalled();
    });

    it('should cache and return new data when cache is empty', async () => {
      // Arrange
      const context = createExecutionContext();
      const responseData = { data: 'fresh' };
      const next = createCallHandler(responseData);
      
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === CACHE_TTL_METADATA) return 3600;
        if (key === CACHE_TAGS_METADATA) return ['test-tag'];
        return undefined;
      });
      
      cacheService.get.mockResolvedValue(null);

      // Act
      const result$ = interceptor.intercept(context, next);
      const result = await result$.toPromise();

      // Assert
      expect(result).toEqual(responseData);
      expect(cacheService.get).toHaveBeenCalledWith(
        'TestClass:testMethod:{}',
        expect.objectContaining({
          ttl: 3600,
          tags: ['test-tag'],
          tenant: mockTenantId,
        })
      );
      expect(next.handle).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalledWith(
        'TestClass:testMethod:{}',
        responseData,
        expect.objectContaining({
          ttl: 3600,
          tags: ['test-tag'],
          tenant: mockTenantId,
        })
      );
    });

    it('should bypass cache for non-GET requests', async () => {
      // Arrange
      const context = createExecutionContext();
      const responseData = { data: 'fresh' };
      const next = createCallHandler(responseData);
      
      jest.spyOn(context.switchToHttp(), 'getRequest').mockReturnValue({
        method: 'POST',
        url: '/test',
        params: {},
        query: {},
        body: {},
      });

      // Act
      const result$ = interceptor.intercept(context, next);
      const result = await result$.toPromise();

      // Assert
      expect(result).toEqual(responseData);
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(next.handle).toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should handle cache errors gracefully', async () => {
      // Arrange
      const context = createExecutionContext();
      const responseData = { data: 'fresh' };
      const next = createCallHandler(responseData);
      
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === CACHE_TTL_METADATA) return 3600;
        if (key === CACHE_TAGS_METADATA) return ['test-tag'];
        return undefined;
      });
      
      cacheService.get.mockRejectedValue(new Error('Cache error'));

      // Act
      const result$ = interceptor.intercept(context, next);
      const result = await result$.toPromise();

      // Assert
      expect(result).toEqual(responseData);
      expect(next.handle).toHaveBeenCalled();
    });
  });
}); 