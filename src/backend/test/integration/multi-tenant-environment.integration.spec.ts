import { EntityManager } from '@mikro-orm/core';
import { v4 as uuidv4 } from 'uuid';
import { RedisCacheService } from '../../src/common/cache/redis-cache.service';
import { Tenant, TenantStatus } from '../../src/tenants/entities/tenant.entity';
import { TenantContext } from '../../src/tenants/services/tenant-context.service';
import { Permission } from '../../src/users/entities/permission.entity';
import { Role } from '../../src/users/entities/role.entity';
import { User } from '../../src/users/entities/user.entity';
import { MultiTenantTestEnvironment } from '../utils/containers/multi-tenant-test-environment';

describe('Multi-Tenant Environment Integration Tests', () => {
  let env: MultiTenantTestEnvironment;
  let cacheService: RedisCacheService;
  let em: EntityManager;

  const TEST_TENANT_ID = uuidv4();
  let testTenant: Tenant;
  let testCounter = 0;

  beforeAll(async () => {
    // Create the multi-tenant test environment
    env = new MultiTenantTestEnvironment({
      postgres: {
        entities: [User, Role, Permission, Tenant],
      },
      redis: {},
      providers: [],
      defaultTenantId: TEST_TENANT_ID,
    });

    // Start the environment
    const moduleRef = await env.start();

    // Get services and repositories
    cacheService = moduleRef.get<RedisCacheService>(RedisCacheService);
    em = moduleRef.get<EntityManager>(EntityManager);

    // Delete any existing test tenants to avoid conflicts
    await em.getConnection().execute('DELETE FROM tenants');
  }, 30000);

  afterAll(async () => {
    // Clean up ORM resources
    if (em) {
      em.clear();
    }

    // Stop environment and close all containers
    try {
      await env.stop();
    } catch (error) {
      console.error('Error stopping test environment:', error);
    }

    // Explicitly close all open connections
    if (cacheService) {
      try {
        // If the cache service has a close method
        if (typeof (cacheService as any).close === 'function') {
          await (cacheService as any).close();
        }
      } catch (error) {
        console.error('Error closing cache service:', error);
      }
    }
  });

  beforeEach(async () => {
    // Clear database and cache between tests
    await env.clearDatabase();
    await env.clearCache();

    // Reset tenant ID to default
    env.setTenantId(TEST_TENANT_ID);

    // Increment counter to get unique names
    testCounter++;
    const timestamp = Date.now();

    // Create a test tenant for our tests
    testTenant = new Tenant();
    testTenant.id = uuidv4();
    testTenant.name = `Integration Test Tenant ${testCounter}-${timestamp}`;
    testTenant.domain = `integration-test-${testCounter}-${timestamp}.example.com`;
    testTenant.status = TenantStatus.ACTIVE;

    await em.persistAndFlush(testTenant);
  }, 30000);

  it('should create a user and cache related data', async () => {
    // Create a user
    const user = new User();
    user.profile = {
      firstName: 'Combined Test',
      lastName: 'User',
      preferredLanguage: 'en',
    };
    user.email = 'combined@example.com';
    user.password = 'hashedPassword123';
    user.tenantId = testTenant.id;
    user.tenant = testTenant; // Assign the tenant reference

    // Save the user
    await em.persistAndFlush(user);

    // Cache some user-related data
    await cacheService.set(`user-preferences:${user.id}`, {
      theme: 'dark',
      notifications: true,
    });

    // Find the user using the entity manager
    const foundUser = await em.findOne(User, { id: user.id, tenantId: testTenant.id });
    expect(foundUser).toBeDefined();
    expect(foundUser?.profile.firstName).toBe('Combined Test');
    expect(foundUser?.profile.lastName).toBe('User');

    // Retrieve cached data
    const preferences = await cacheService.get(`user-preferences:${user.id}`);
    expect(preferences).toEqual({
      theme: 'dark',
      notifications: true,
    });
  });

  it('should demonstrate tenant isolation across both PostgreSQL and Redis', async () => {
    // Setup data for tenant 1
    const timestamp = Date.now();
    const tenant1 = new Tenant();
    tenant1.id = uuidv4();
    tenant1.name = `Isolation Tenant 1 - ${testCounter}-${timestamp}`;
    tenant1.domain = `isolation-tenant1-${testCounter}-${timestamp}.example.com`;
    tenant1.status = TenantStatus.ACTIVE;
    await em.persistAndFlush(tenant1);

    const tenant1Id = tenant1.id;
    env.setTenantId(tenant1Id);

    // Create tenant 1 user
    const user1 = new User();
    user1.profile = {
      firstName: 'Tenant 1',
      lastName: 'User',
      preferredLanguage: 'en',
    };
    user1.email = 'user@tenant1.com';
    user1.password = 'password123';
    user1.tenantId = tenant1Id;
    user1.tenant = tenant1;
    await em.persistAndFlush(user1);

    // Cache tenant 1 data
    await cacheService.set('config', { name: 'Tenant 1 Config' });

    // Setup data for tenant 2
    const tenant2 = new Tenant();
    tenant2.id = uuidv4();
    tenant2.name = `Isolation Tenant 2 - ${testCounter}-${timestamp}`;
    tenant2.domain = `isolation-tenant2-${testCounter}-${timestamp}.example.com`;
    tenant2.status = TenantStatus.ACTIVE;
    await em.persistAndFlush(tenant2);

    const tenant2Id = tenant2.id;
    env.setTenantId(tenant2Id);

    // Create tenant 2 user
    const user2 = new User();
    user2.profile = {
      firstName: 'Tenant 2',
      lastName: 'User',
      preferredLanguage: 'en',
    };
    user2.email = 'user@tenant2.com';
    user2.password = 'password123';
    user2.tenantId = tenant2Id;
    user2.tenant = tenant2;
    await em.persistAndFlush(user2);

    // Cache tenant 2 data
    await cacheService.set('config', { name: 'Tenant 2 Config' });

    // Test tenant 1 isolation
    env.setTenantId(tenant1Id);
    const tenant1User = await em.findOne(User, { email: 'user@tenant1.com', tenantId: tenant1Id });
    const tenant1Cache = await cacheService.get('config');

    // Test tenant 2 isolation
    env.setTenantId(tenant2Id);
    const tenant2User = await em.findOne(User, { email: 'user@tenant2.com', tenantId: tenant2Id });
    const tenant2Cache = await cacheService.get('config');

    // Verify isolation in database
    expect(tenant1User?.profile.firstName).toBe('Tenant 1');
    expect(tenant1User?.profile.lastName).toBe('User');
    expect(tenant2User?.profile.firstName).toBe('Tenant 2');
    expect(tenant2User?.profile.lastName).toBe('User');

    // Verify isolation in cache
    expect(tenant1Cache).toEqual({ name: 'Tenant 1 Config' });
    expect(tenant2Cache).toEqual({ name: 'Tenant 2 Config' });

    // Verify cross-tenant isolation
    env.setTenantId(tenant1Id);
    const wrongTenantUser = await em.findOne(User, {
      email: 'user@tenant2.com',
      tenantId: tenant1Id,
    });
    expect(wrongTenantUser).toBeNull();
  });

  it('should support tag-based cache invalidation for database operations', async () => {
    // Create a user
    const user = new User();
    user.profile = {
      firstName: 'Cache Tag',
      lastName: 'User',
      preferredLanguage: 'en',
    };
    user.email = 'cache.tags@example.com';
    user.password = 'secure123';
    user.tenantId = testTenant.id;
    user.tenant = testTenant; // Assign the tenant reference

    // Save the user
    await em.persistAndFlush(user);

    // Cache user data with tags
    await cacheService.set(
      `user:${user.id}`,
      {
        id: user.id,
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        email: user.email,
      },
      { tags: ['user', `user:${user.id}`] }
    );

    // Cache user settings with tags
    await cacheService.set(
      `user-settings:${user.id}`,
      {
        language: 'en',
        timezone: 'UTC',
      },
      { tags: ['user-settings', `user:${user.id}`] }
    );

    // Verify cached data exists
    let userData = await cacheService.get(`user:${user.id}`);
    let userSettings = await cacheService.get(`user-settings:${user.id}`);

    expect(userData).toBeDefined();
    expect(userSettings).toBeDefined();

    // Invalidate by user tag
    await cacheService.deleteByTags([`user:${user.id}`]);

    // Verify both caches are invalidated
    userData = await cacheService.get(`user:${user.id}`);
    userSettings = await cacheService.get(`user-settings:${user.id}`);

    expect(userData).toBeNull();
    expect(userSettings).toBeNull();
  });
});
