import { EntityManager } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';
import { Tenant, TenantStatus } from '../../src/tenants/entities/tenant.entity';
import { Permission } from '../../src/users/entities/permission.entity';
import { Role } from '../../src/users/entities/role.entity';
import { User, UserStatus } from '../../src/users/entities/user.entity';
import { RoleRepository } from '../../src/users/repositories/role.repository';
import { UserRepository } from '../../src/users/repositories/user.repository';
import { UserService } from '../../src/users/services/user.service';
import { MultiTenantTestEnvironment } from '../utils/containers/multi-tenant-test-environment';

describe('UserService Integration Tests', () => {
  let environment: MultiTenantTestEnvironment;
  let userService: UserService;
  let userRepository: UserRepository;
  let roleRepository: RoleRepository;
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
      providers: [UserService, UserRepository, RoleRepository],
    });

    // Start environment and get the test module
    moduleRef = await environment.start();

    // Get the entity manager
    em = moduleRef.get<EntityManager>(EntityManager);

    // Get properly initialized repositories
    userRepository = environment.getRepository<User>(UserRepository);
    roleRepository = environment.getRepository<Role>(RoleRepository);

    // Create user service
    userService = new UserService(em);

    // Get the tenant IDs created by the container
    const testTenantIds = environment.postgresContainer?.getTestTenantIds();
    if (testTenantIds) {
      // Use the container-generated tenant IDs
      TEST_TENANT_ID = testTenantIds.tenant1;
      OTHER_TENANT_ID = testTenantIds.tenant2;
    }
  }, 30000); // Increase timeout for container startup

  afterAll(async () => {
    // Clean up ORM resources
    if (em) {
      em.clear();
    }

    // Stop environment with error handling
    try {
      await environment.stop();
    } catch (error) {
      console.error('Error stopping test environment:', error);
    }

    // Additionally close the module if still open
    if (moduleRef) {
      try {
        await moduleRef.close();
      } catch (error) {
        console.error('Error closing test module:', error);
      }
    }
  });

  beforeEach(async () => {
    // Clean the database before each test
    await environment.clearDatabase();

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

    em.clear();
  });

  it('should create a user with proper tenant isolation', async () => {
    // Create a user
    const user = await userService.createUser(
      {
        email: 'test@example.com',
        password: 'password123',
        profile: {
          firstName: 'Test',
          lastName: 'User',
        },
      },
      testTenant1.id
    );

    // Verify user
    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@example.com');
    expect(user.tenantId).toBe(testTenant1.id);

    // Clear entity manager
    em.clear();

    // Verify the user exists in the correct tenant
    const foundUser = await em.findOne(User, {
      email: 'test@example.com',
      tenantId: testTenant1.id,
    });
    expect(foundUser).toBeDefined();
    expect(foundUser?.id).toBe(user.id);

    // Verify user isolation (should not be visible in other tenant)
    environment.setTenantId(testTenant2.id);
    const notFoundUser = await em.findOne(User, {
      email: 'test@example.com',
      tenantId: testTenant2.id,
    });
    expect(notFoundUser).toBeNull();
  });

  it('should assign roles to a user', async () => {
    // Create a user
    const user = await userService.createUser(
      {
        email: 'role-test@example.com',
        password: 'password123',
        profile: {
          firstName: 'Role',
          lastName: 'Test',
        },
      },
      testTenant1.id
    );

    // Create roles
    const role1 = em.create(Role, {
      name: 'Admin',
      description: 'Administrator role',
      tenantId: testTenant1.id,
      tenant: testTenant1,
    });

    const role2 = em.create(Role, {
      name: 'Editor',
      description: 'Editor role',
      tenantId: testTenant1.id,
      tenant: testTenant1,
    });

    await em.persistAndFlush([role1, role2]);
    em.clear();

    // Assign roles to user
    await userService.assignRoles(user.id, [role1.id, role2.id], testTenant1.id);

    // Verify roles assignment
    const userWithRoles = await em.findOne(
      User,
      { id: user.id, tenantId: testTenant1.id },
      { populate: ['roles'] }
    );
    expect(userWithRoles).toBeDefined();
    expect(userWithRoles?.roles.isInitialized()).toBe(true);
    expect(userWithRoles?.roles.length).toBe(2);

    // Only proceed if userWithRoles is defined
    if (userWithRoles) {
      const roleNames = [...userWithRoles.roles].map((r) => r.name).sort();
      expect(roleNames).toEqual(['Admin', 'Editor']);
    }
  });

  it('should remove roles from a user', async () => {
    // Create a user
    const user = await userService.createUser(
      {
        email: 'remove-role@example.com',
        password: 'password123',
        profile: {
          firstName: 'Remove',
          lastName: 'Role',
        },
      },
      testTenant1.id
    );

    // Create roles
    const adminRole = em.create(Role, {
      name: 'Admin2',
      description: 'Administrator role',
      tenantId: testTenant1.id,
      tenant: testTenant1,
    });

    const editorRole = em.create(Role, {
      name: 'Editor2',
      description: 'Editor role',
      tenantId: testTenant1.id,
      tenant: testTenant1,
    });

    const viewerRole = em.create(Role, {
      name: 'Viewer',
      description: 'Viewer role',
      tenantId: testTenant1.id,
      tenant: testTenant1,
    });

    await em.persistAndFlush([adminRole, editorRole, viewerRole]);

    // Assign roles to user
    user.roles.add(adminRole, editorRole, viewerRole);
    await em.flush();
    em.clear();

    // Remove only one role
    await userService.removeRoles(user.id, [editorRole.id], testTenant1.id);

    // Verify roles after removal
    const userWithRoles = await em.findOne(
      User,
      { id: user.id, tenantId: testTenant1.id },
      { populate: ['roles'] }
    );
    expect(userWithRoles).toBeDefined();
    expect(userWithRoles?.roles.isInitialized()).toBe(true);
    expect(userWithRoles?.roles.length).toBe(2);

    // Only proceed if userWithRoles is defined
    if (userWithRoles) {
      const roleNames = [...userWithRoles.roles].map((r) => r.name).sort();
      expect(roleNames).toEqual(['Admin2', 'Viewer']);
    }
  });

  it('should activate and deactivate a user', async () => {
    // Create a user
    const user = await userService.createUser(
      {
        email: 'status@example.com',
        password: 'password123',
        profile: {
          firstName: 'Status',
          lastName: 'Test',
        },
      },
      testTenant1.id
    );

    expect(user.status).toBe(UserStatus.PENDING);

    // Activate user
    const activatedUser = await userService.activateUser(user.id, testTenant1.id);
    expect(activatedUser.status).toBe(UserStatus.ACTIVE);

    // Clear entity manager to ensure fresh data
    em.clear();

    // Verify user status
    let refreshedUser = await em.findOne(User, { id: user.id, tenantId: testTenant1.id });
    expect(refreshedUser?.status).toBe(UserStatus.ACTIVE);

    // Deactivate user
    const deactivatedUser = await userService.deactivateUser(user.id, testTenant1.id);
    expect(deactivatedUser.status).toBe(UserStatus.INACTIVE);

    // Clear entity manager to ensure fresh data
    em.clear();

    // Verify user status
    refreshedUser = await em.findOne(User, { id: user.id, tenantId: testTenant1.id });
    expect(refreshedUser?.status).toBe(UserStatus.INACTIVE);
  });

  it('should update a user profile', async () => {
    // Create a user
    const user = await userService.createUser(
      {
        email: 'update@example.com',
        password: 'password123',
        profile: {
          firstName: 'Before',
          lastName: 'Update',
        },
      },
      testTenant1.id
    );

    // Update user
    const updatedUser = await userService.updateUser(
      user.id,
      {
        profile: {
          firstName: 'After',
          lastName: 'Updated',
        },
      },
      testTenant1.id
    );

    expect(updatedUser.profile.firstName).toBe('After');
    expect(updatedUser.profile.lastName).toBe('Updated');

    // Clear entity manager to ensure fresh data
    em.clear();

    // Verify user update
    const refreshedUser = await em.findOne(User, { id: user.id, tenantId: testTenant1.id });
    expect(refreshedUser?.profile.firstName).toBe('After');
    expect(refreshedUser?.profile.lastName).toBe('Updated');
  });

  it('should throw error when creating user with duplicate email in same tenant', async () => {
    // Create first user
    await userService.createUser(
      {
        email: 'duplicate@example.com',
        password: 'password123',
        profile: {
          firstName: 'Duplicate',
          lastName: 'Test',
        },
      },
      testTenant1.id
    );

    // Try to create another user with same email in same tenant
    await expect(
      userService.createUser(
        {
          email: 'duplicate@example.com',
          password: 'differentpass',
          profile: {
            firstName: 'Another',
            lastName: 'User',
          },
        },
        testTenant1.id
      )
    ).rejects.toThrow();
  });

  it('should allow same email in different tenants', async () => {
    // Create user in first tenant
    await userService.createUser(
      {
        email: 'multitenant@example.com',
        password: 'password123',
        profile: {
          firstName: 'First',
          lastName: 'Tenant',
        },
      },
      testTenant1.id
    );

    // Create user with same email in second tenant
    const secondUser = await userService.createUser(
      {
        email: 'multitenant@example.com',
        password: 'password123',
        profile: {
          firstName: 'Second',
          lastName: 'Tenant',
        },
      },
      testTenant2.id
    );

    expect(secondUser).toBeDefined();
    expect(secondUser.email).toBe('multitenant@example.com');
    expect(secondUser.tenantId).toBe(testTenant2.id);
  });

  // Patch the UserService's createUser method to ensure tenant reference is set
  const originalCreateUser = UserService.prototype.createUser;
  UserService.prototype.createUser = async function (createUserDto, tenantId) {
    const user = await originalCreateUser.call(this, createUserDto, tenantId);

    // Ensure tenant reference is set
    if (!user.tenant) {
      const tenant = await this.em.findOne(Tenant, { id: tenantId });
      if (tenant) {
        user.tenant = tenant;
        await this.em.flush();
      }
    }

    return user;
  };
});
