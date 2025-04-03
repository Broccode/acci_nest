import { Test, TestingModule } from '@nestjs/testing';
import { Redis } from 'ioredis';
import { RedisCacheService } from '../../src/common/cache/redis-cache.service';
import { REDIS_CLIENT, TENANT_CONTEXT } from '../../src/common/constants';
import { TenantContext } from '../../src/tenants/services/tenant-context.service';
import { RedisTestContainer } from '../utils/containers';

describe('RedisCacheService Integration Tests', () => {
  let container: RedisTestContainer;
  let cacheService: RedisCacheService;
  let redisClient: Redis;
  let mockTenantContext: Partial<TenantContext>;

  const TEST_TENANT_ID = 'test-tenant-1';
  const OTHER_TENANT_ID = 'test-tenant-2';

  beforeAll(async () => {
    // Set up the Redis container
    container = new RedisTestContainer();

    // Start the container and get the module
    const moduleRef = await container.start();

    // Get connection details for the Redis client
    const connectionDetails = container.getConnectionDetails();
    redisClient = new Redis({
      host: connectionDetails.host,
      port: connectionDetails.port,
    });

    // Create a mock tenant context
    mockTenantContext = {
      getCurrentTenant: jest.fn().mockReturnValue(TEST_TENANT_ID),
      hasTenant: jest.fn().mockReturnValue(true),
    } as Partial<TenantContext>;

    // Create a new module with our services
    const testModule = await Test.createTestingModule({
      providers: [
        RedisCacheService,
        {
          provide: REDIS_CLIENT,
          useValue: redisClient,
        },
        {
          provide: TENANT_CONTEXT,
          useValue: mockTenantContext,
        },
      ],
    }).compile();

    // Get the cache service
    cacheService = testModule.get<RedisCacheService>(RedisCacheService);
  }, 30000);

  afterAll(async () => {
    // If available, explicitly close Redis client and cache service
    if (cacheService && typeof (cacheService as any).close === 'function') {
      try {
        await (cacheService as any).close();
      } catch (error) {
        console.error('Error closing cache service:', error);
      }
    }

    // Clean up all resources and stop container
    try {
      if (container) {
        await container.stop();
      }
    } catch (error) {
      console.error('Error stopping Redis container:', error);
    }
  });

  beforeEach(async () => {
    // Clear Redis database before each test
    await redisClient.flushdb();
  });

  it('should store and retrieve values', async () => {
    const key = 'test-key';
    const value = { name: 'Test Object', value: 42 };

    // Store a value
    await cacheService.set(key, value);

    // Retrieve the value
    const retrieved = await cacheService.get(key);

    // Verify value was correctly stored and retrieved
    expect(retrieved).toEqual(value);
  });

  it('should respect tenant isolation', async () => {
    const key = 'shared-key';
    const tenant1Value = { tenant: 'tenant1', value: 'Private Data' };
    const tenant2Value = { tenant: 'tenant2', value: 'Other Private Data' };

    // Store value for tenant 1
    (mockTenantContext.getCurrentTenant as jest.Mock).mockReturnValue(TEST_TENANT_ID);
    await cacheService.set(key, tenant1Value);

    // Store value for tenant 2
    (mockTenantContext.getCurrentTenant as jest.Mock).mockReturnValue(OTHER_TENANT_ID);
    await cacheService.set(key, tenant2Value);

    // Get value for tenant 1
    (mockTenantContext.getCurrentTenant as jest.Mock).mockReturnValue(TEST_TENANT_ID);
    const retrieved1 = await cacheService.get(key);

    // Get value for tenant 2
    (mockTenantContext.getCurrentTenant as jest.Mock).mockReturnValue(OTHER_TENANT_ID);
    const retrieved2 = await cacheService.get(key);

    // Verify tenant isolation
    expect(retrieved1).toEqual(tenant1Value);
    expect(retrieved2).toEqual(tenant2Value);
  });

  it('should honor TTL setting', async () => {
    const key = 'expiring-key';
    const value = { temporary: true };

    // Store a value with 1 second TTL
    await cacheService.set(key, value, { ttl: 1 });

    // Verify it exists immediately
    let retrieved = await cacheService.get(key);
    expect(retrieved).toEqual(value);

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Verify it's gone after expiration
    retrieved = await cacheService.get(key);
    expect(retrieved).toBeNull();
  });

  it('should support tag-based invalidation', async () => {
    // Store multiple values with tags
    await cacheService.set('key1', 'value1', { tags: ['tag1', 'shared'] });
    await cacheService.set('key2', 'value2', { tags: ['tag1'] });
    await cacheService.set('key3', 'value3', { tags: ['tag2', 'shared'] });

    // Invalidate by tag1 - should remove key1 and key2
    await cacheService.deleteByTags(['tag1']);

    // Check results
    const val1 = await cacheService.get('key1');
    const val2 = await cacheService.get('key2');
    const val3 = await cacheService.get('key3');

    expect(val1).toBeNull();
    expect(val2).toBeNull();
    expect(val3).toEqual('value3');
  });

  it('should delete by tenant', async () => {
    // Set tenant1 data
    (mockTenantContext.getCurrentTenant as jest.Mock).mockReturnValue(TEST_TENANT_ID);
    await cacheService.set('tenant-key1', 'tenant1-value1');
    await cacheService.set('tenant-key2', 'tenant1-value2');

    // Set tenant2 data
    (mockTenantContext.getCurrentTenant as jest.Mock).mockReturnValue(OTHER_TENANT_ID);
    await cacheService.set('tenant-key1', 'tenant2-value1');

    // Delete tenant1 data
    await cacheService.deleteByTenant(TEST_TENANT_ID);

    // Verify tenant1 data is gone
    (mockTenantContext.getCurrentTenant as jest.Mock).mockReturnValue(TEST_TENANT_ID);
    const tenant1Key1 = await cacheService.get('tenant-key1');
    const tenant1Key2 = await cacheService.get('tenant-key2');

    // Verify tenant2 data remains
    (mockTenantContext.getCurrentTenant as jest.Mock).mockReturnValue(OTHER_TENANT_ID);
    const tenant2Key1 = await cacheService.get('tenant-key1');

    expect(tenant1Key1).toBeNull();
    expect(tenant1Key2).toBeNull();
    expect(tenant2Key1).toEqual('tenant2-value1');
  });
});
