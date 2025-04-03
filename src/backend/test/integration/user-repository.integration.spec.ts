import { EntityManager } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';
import { Tenant, TenantStatus } from '../../src/tenants/entities/tenant.entity';
import { Permission } from '../../src/users/entities/permission.entity';
import { Role } from '../../src/users/entities/role.entity';
import { User, UserStatus } from '../../src/users/entities/user.entity';
import { UserRepository } from '../../src/users/repositories/user.repository';
import { MultiTenantTestEnvironment } from '../utils/containers/multi-tenant-test-environment';

describe('UserRepository Integration Tests', () => {
  let environment: MultiTenantTestEnvironment;
  let userRepository: UserRepository;
  let em: EntityManager;
  let moduleRef: TestingModule;

  let TEST_TENANT_ID = uuidv4();
  let OTHER_TENANT_ID = uuidv4();
  let testTenant1: Tenant;
  let testTenant2: Tenant;

  beforeAll(async () => {
    // Create multi-tenant test environment
    environment = new MultiTenantTestEnvironment({
      postgres: {
        entities: [User, Role, Permission, Tenant],
      },
      defaultTenantId: TEST_TENANT_ID,
      providers: [UserRepository],
    });

    // Start environment and get the test module
    moduleRef = await environment.start();

    // Get entity manager
    em = moduleRef.get<EntityManager>(EntityManager);

    // Get properly initialized user repository using our helper method
    userRepository = environment.getRepository<User>(UserRepository);

    // Get the tenant IDs created by the container
    const testTenantIds = environment.postgresContainer?.getTestTenantIds();
    if (testTenantIds) {
      // Use the container-generated tenant IDs
      TEST_TENANT_ID = testTenantIds.tenant1;
      OTHER_TENANT_ID = testTenantIds.tenant2;
    }
  }, 30000);

  // Increase timeout for all tests
  jest.setTimeout(30000);

  afterAll(async () => {
    await environment.stop();
  });

  beforeEach(async () => {
    // Clean the database before each test
    await environment.clearDatabase();

    // Use a fresh entity manager for each test
    em = moduleRef.get<EntityManager>(EntityManager);

    // Re-initialize the user repository with fresh EntityManager
    userRepository = environment.getRepository<User>(UserRepository);

    // Clear entity manager
    em.clear();

    // Set the tenant context
    environment.setTenantId(TEST_TENANT_ID);

    // Fetch the tenants created by the test environment instead of creating new ones
    const tenants = await em.find(Tenant, {});
    if (tenants.length >= 2) {
      testTenant1 = tenants[0];
      testTenant2 = tenants[1];
    } else {
      // If tenants don't exist yet (unlikely), create them
      testTenant1 = new Tenant();
      testTenant1.id = TEST_TENANT_ID;
      testTenant1.name = 'Test Tenant 1';
      testTenant1.domain = 'test1.example.com';
      testTenant1.status = TenantStatus.ACTIVE;

      testTenant2 = new Tenant();
      testTenant2.id = OTHER_TENANT_ID;
      testTenant2.name = 'Test Tenant 2';
      testTenant2.domain = 'test2.example.com';
      testTenant2.status = TenantStatus.ACTIVE;

      await em.persistAndFlush([testTenant1, testTenant2]);
    }
  });

  it('should create a user and find it by email', async () => {
    // Create a user
    const user = new User();
    user.email = 'test@example.com';
    user.password = 'hashedPassword123';
    user.profile = {
      firstName: 'Test',
      lastName: 'User',
      preferredLanguage: 'en',
    };
    user.tenantId = TEST_TENANT_ID;
    user.tenant = testTenant1; // Setze den Tenant-Bezug

    // Save the user through the entity manager
    await em.persistAndFlush(user);

    // Find the user using the repository
    const foundUser = await userRepository.findByEmail('test@example.com', TEST_TENANT_ID);

    // Verify the user was found
    expect(foundUser).toBeDefined();
    expect(foundUser?.email).toBe('test@example.com');
    expect(foundUser?.tenantId).toBe(TEST_TENANT_ID);
  });

  it('should respect tenant isolation', async () => {
    // Create a user in tenant 1
    const user1 = new User();
    user1.email = 'tenant1@example.com';
    user1.password = 'hashedPassword123';
    user1.profile = {
      firstName: 'Tenant 1',
      lastName: 'User',
      preferredLanguage: 'en',
    };
    user1.tenantId = TEST_TENANT_ID;
    user1.tenant = testTenant1; // Setze den Tenant-Bezug

    // Create a user in tenant 2
    const user2 = new User();
    user2.email = 'tenant2@example.com';
    user2.password = 'hashedPassword123';
    user2.profile = {
      firstName: 'Tenant 2',
      lastName: 'User',
      preferredLanguage: 'en',
    };
    user2.tenantId = OTHER_TENANT_ID;
    user2.tenant = testTenant2; // Setze den Tenant-Bezug

    // Save both users
    await em.persistAndFlush([user1, user2]);

    // Find user in tenant 1
    const foundInTenant1 = await userRepository.findByEmail('tenant1@example.com', TEST_TENANT_ID);
    expect(foundInTenant1).toBeDefined();
    expect(foundInTenant1?.email).toBe('tenant1@example.com');

    // Should not find tenant 2 user when looking in tenant 1
    const notFoundInTenant1 = await userRepository.findByEmail(
      'tenant2@example.com',
      TEST_TENANT_ID
    );
    expect(notFoundInTenant1).toBeNull();

    // Find user in tenant 2
    const foundInTenant2 = await userRepository.findByEmail('tenant2@example.com', OTHER_TENANT_ID);
    expect(foundInTenant2).toBeDefined();
    expect(foundInTenant2?.email).toBe('tenant2@example.com');
  });

  it('should update last login timestamp', async () => {
    // Create a user
    const user = new User();
    user.email = 'login@example.com';
    user.password = 'hashedPassword123';
    user.profile = {
      firstName: 'Login Test',
      lastName: 'User',
      preferredLanguage: 'en',
    };
    user.tenantId = TEST_TENANT_ID;
    user.tenant = testTenant1; // Setze den Tenant-Bezug
    user.lastLogin = null;

    // Save the user
    await em.persistAndFlush(user);

    // Update last login
    await userRepository.updateLastLogin(user.id, TEST_TENANT_ID);

    // Clear entity manager
    em.clear();

    // Fetch updated user
    const updatedUser = await userRepository.findByEmail('login@example.com', TEST_TENANT_ID);

    // Verify last login is set
    expect(updatedUser).toBeDefined();
    expect(updatedUser?.lastLogin).toBeDefined();
    expect(updatedUser?.lastLogin instanceof Date).toBe(true);
  });
});
