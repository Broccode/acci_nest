import { EntityManager } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';
import { Tenant, TenantStatus } from '../../src/tenants/entities/tenant.entity';
import { Permission } from '../../src/users/entities/permission.entity';
import { Role } from '../../src/users/entities/role.entity';
import { User } from '../../src/users/entities/user.entity';
import { PermissionRepository } from '../../src/users/repositories/permission.repository';
import { MultiTenantTestEnvironment } from '../utils/containers/multi-tenant-test-environment';

describe('PermissionRepository Integration Tests', () => {
  let environment: MultiTenantTestEnvironment;
  let permissionRepository: PermissionRepository;
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
      providers: [PermissionRepository],
    });

    // Start environment and get the test module
    moduleRef = await environment.start();

    // Get entity manager
    em = moduleRef.get<EntityManager>(EntityManager);

    // Get properly initialized permission repository using our helper method
    permissionRepository = environment.getRepository<Permission>(PermissionRepository);

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

    // Re-initialize the permission repository with fresh EntityManager
    permissionRepository = environment.getRepository<Permission>(PermissionRepository);

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

  it('should create a permission and find it by resource and action', async () => {
    // Create a permission
    const permission = new Permission();
    permission.resource = 'users';
    permission.action = 'read';

    await em.persistAndFlush(permission);

    // Find the permission
    const foundPermission = await permissionRepository.findByResourceAndAction('users', 'read');

    // Verify the permission was found
    expect(foundPermission).toBeDefined();
    expect(foundPermission?.resource).toBe('users');
    expect(foundPermission?.action).toBe('read');
  });

  it('should store and retrieve conditions in permissions', async () => {
    // Create a permission with conditions
    const permission = new Permission();
    permission.resource = 'documents';
    permission.action = 'read';
    permission.conditions = {
      ownerOnly: true,
      maxSize: 1024,
    };

    await em.persistAndFlush(permission);

    // Find the permission
    const foundPermission = await permissionRepository.findByResourceAndAction('documents', 'read');

    // Verify the permission was found with conditions
    expect(foundPermission).toBeDefined();
    expect(foundPermission?.conditions).toEqual({
      ownerOnly: true,
      maxSize: 1024,
    });
  });

  it('should find all permissions for a role', async () => {
    // Create permissions
    const createPermission = new Permission();
    createPermission.resource = 'users';
    createPermission.action = 'create';

    const readPermission = new Permission();
    readPermission.resource = 'users';
    readPermission.action = 'read';

    const updatePermission = new Permission();
    updatePermission.resource = 'users';
    updatePermission.action = 'update';

    // Create a role
    const role = new Role();
    role.name = 'UserEditor';
    role.description = 'Can edit users';
    role.tenantId = TEST_TENANT_ID;
    role.tenant = testTenant1; // Set the tenant reference

    // Save permissions and role
    await em.persistAndFlush([createPermission, readPermission, updatePermission, role]);

    // Assign only read and update permissions to role
    role.permissions.add(readPermission, updatePermission);
    await em.flush();

    // Find permissions for the role
    const permissions = await permissionRepository.findForRole(role.id);

    // Verify the correct permissions were found
    expect(permissions).toBeDefined();
    expect(permissions.length).toBe(2);

    const resources = permissions.map((p) => p.resource);
    const actions = permissions.map((p) => p.action);

    expect(resources).toEqual(['users', 'users']);
    expect(actions).toContain('read');
    expect(actions).toContain('update');
    expect(actions).not.toContain('create');
  });

  it('should correctly handle multiple roles with overlapping permissions', async () => {
    // Create permissions
    const createPermission = new Permission();
    createPermission.resource = 'posts';
    createPermission.action = 'create';

    const readPermission = new Permission();
    readPermission.resource = 'posts';
    readPermission.action = 'read';

    const deletePermission = new Permission();
    deletePermission.resource = 'posts';
    deletePermission.action = 'delete';

    // Create roles
    const authorRole = new Role();
    authorRole.name = 'Author';
    authorRole.description = 'Can create and read posts';
    authorRole.tenantId = TEST_TENANT_ID;
    authorRole.tenant = testTenant1; // Set the tenant reference

    const editorRole = new Role();
    editorRole.name = 'Editor';
    editorRole.description = 'Can read and delete posts';
    editorRole.tenantId = TEST_TENANT_ID;
    editorRole.tenant = testTenant1; // Set the tenant reference

    // Save all entities
    await em.persistAndFlush([
      createPermission,
      readPermission,
      deletePermission,
      authorRole,
      editorRole,
    ]);

    // Assign permissions to roles
    authorRole.permissions.add(createPermission, readPermission);
    editorRole.permissions.add(readPermission, deletePermission);
    await em.flush();

    // Create user with both roles
    const user = new User();
    user.email = 'multi-role@example.com';
    user.password = 'hashedPassword123';
    user.profile = {
      firstName: 'Multi',
      lastName: 'Role',
      preferredLanguage: 'en',
    };
    user.tenantId = TEST_TENANT_ID;
    user.tenant = testTenant1; // Set the tenant reference
    user.roles.add(authorRole, editorRole);

    await em.persistAndFlush(user);

    // Get combined unique permissions for the user
    const authorPermissions = await permissionRepository.findForRole(authorRole.id);
    const editorPermissions = await permissionRepository.findForRole(editorRole.id);

    // Verify correct permissions for each role
    expect(authorPermissions.length).toBe(2);
    expect(editorPermissions.length).toBe(2);

    // Combine permissions and ensure uniqueness
    const allPermissions = [...authorPermissions, ...editorPermissions];
    const uniqueActions = new Set(allPermissions.map((p) => p.action));

    // Verify combined permissions
    expect(uniqueActions.size).toBe(3);
    expect(uniqueActions.has('create')).toBe(true);
    expect(uniqueActions.has('read')).toBe(true);
    expect(uniqueActions.has('delete')).toBe(true);
  });
});
