import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { RedisCacheService } from '../redis-cache.service';
import { CacheOptions } from '../cache.interface';
import { TENANT_CONTEXT } from '../../../common/constants';
import { REDIS_CLIENT } from '../../../common/constants';

describe('RedisCacheService', () => {
  let service: RedisCacheService;
  let cacheManager: jest.Mocked<Cache>;
  let configService: jest.Mocked<ConfigService>;
  let redisClient: any;

  const mockCacheConfig = {
    ttl: 3600,
    max: 100,
    isGlobal: true,
  };

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'cache') return mockCacheConfig;
        return undefined;
      }),
    };

    const mockTenantContext = {
      getCurrentTenant: jest.fn(() => 'test-tenant'),
      hasTenant: jest.fn(() => true),
    };

    const mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      scan: jest.fn(),
      flushdb: jest.fn(),
      pipeline: jest.fn().mockReturnValue({
        sadd: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: TENANT_CONTEXT,
          useValue: mockTenantContext,
        },
        {
          provide: REDIS_CLIENT,
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<RedisCacheService>(RedisCacheService);
    cacheManager = module.get(CACHE_MANAGER);
    configService = module.get(ConfigService);
    redisClient = module.get(REDIS_CLIENT);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return cached value when it exists', async () => {
      // Arrange
      const key = 'test-key';
      const cachedValue = { data: 'test-data' };
      redisClient.get.mockResolvedValue(JSON.stringify(cachedValue));

      // Act
      const result = await service.get(key);

      // Assert
      expect(result).toEqual(cachedValue);
      expect(redisClient.get).toHaveBeenCalledWith(expect.stringContaining(key));
    });

    it('should return null when cached value does not exist', async () => {
      // Arrange
      const key = 'non-existent-key';
      redisClient.get.mockResolvedValue(null);

      // Act
      const result = await service.get(key);

      // Assert
      expect(result).toBeNull();
      expect(redisClient.get).toHaveBeenCalledWith(expect.stringContaining(key));
    });

    it('should handle cache errors gracefully', async () => {
      // Arrange
      const key = 'error-key';
      redisClient.get.mockRejectedValue(new Error('Cache error'));

      // Act & Assert
      await expect(service.get(key)).resolves.toBeNull();
      expect(redisClient.get).toHaveBeenCalledWith(expect.stringContaining(key));
    });
  });

  describe('set', () => {
    it('should set cache value with default TTL', async () => {
      // Arrange
      const key = 'test-key';
      const value = { data: 'test-data' };

      // Act
      await service.set(key, value);

      // Assert
      expect(redisClient.set).toHaveBeenCalledWith(
        expect.stringContaining(key),
        JSON.stringify(value),
        'EX',
        mockCacheConfig.ttl
      );
    });

    it('should set cache value with custom TTL', async () => {
      // Arrange
      const key = 'test-key';
      const value = { data: 'test-data' };
      const customTtl = 1800;

      // Act
      await service.set(key, value, { ttl: customTtl });

      // Assert
      expect(redisClient.set).toHaveBeenCalledWith(
        expect.stringContaining(key),
        JSON.stringify(value),
        'EX',
        customTtl
      );
    });

    it('should handle cache set errors gracefully', async () => {
      // Arrange
      const key = 'error-key';
      const value = { data: 'test-data' };
      redisClient.set.mockRejectedValue(new Error('Cache error'));

      // Act & Assert
      await expect(service.set(key, value)).resolves.not.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete cached value', async () => {
      // Arrange
      const key = 'test-key';

      // Act
      await service.delete(key);

      // Assert
      expect(redisClient.del).toHaveBeenCalledWith(expect.stringContaining(key));
    });

    it('should handle delete errors gracefully', async () => {
      // Arrange
      const key = 'error-key';
      redisClient.del.mockRejectedValue(new Error('Cache error'));

      // Act & Assert
      await expect(service.delete(key)).resolves.not.toThrow();
    });
  });
}); 