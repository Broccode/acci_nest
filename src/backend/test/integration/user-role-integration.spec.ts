import { EntityManager } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';
import { Tenant } from '../../src/tenants/entities/tenant.entity';
import { Permission } from '../../src/users/entities/permission.entity';
import { Role } from '../../src/users/entities/role.entity';
import { User, UserStatus } from '../../src/users/entities/user.entity';
import { PermissionRepository } from '../../src/users/repositories/permission.repository';
import { RoleRepository } from '../../src/users/repositories/role.repository';
import { UserRepository } from '../../src/users/repositories/user.repository';
import { RoleService } from '../../src/users/services/role.service';
import { UserService } from '../../src/users/services/user.service';
import { MultiTenantTestEnvironment } from '../utils/containers/multi-tenant-test-environment';

describe('User and Role Integration Tests', () => {
  let environment: MultiTenantTestEnvironment;
  let userService: UserService;
  let roleService: RoleService;
  let userRepository: UserRepository;
  let roleRepository: RoleRepository;
  let permissionRepository: PermissionRepository;
  let em: EntityManager;
  let moduleRef: TestingModule;

  let TEST_TENANT_ID = uuidv4();
  let OTHER_TENANT_ID = uuidv4();

  beforeAll(async () => {
    // Create multi-tenant test environment
    environment = new MultiTenantTestEnvironment({
      postgres: {
        entities: [User, Role, Permission, Tenant],
      },
      defaultTenantId: TEST_TENANT_ID,
      providers: [UserService, RoleService, UserRepository, RoleRepository, PermissionRepository],
    });

    // Start environment and get the test module
    moduleRef = await environment.start();

    // Get the entity manager
    em = moduleRef.get<EntityManager>(EntityManager);

    // Get properly initialized repositories using the environment helper method
    userRepository = environment.getRepository<User>(UserRepository);
    roleRepository = environment.getRepository<Role>(RoleRepository);
    permissionRepository = environment.getRepository<Permission>(PermissionRepository);

    // Initialize services with proper repositories
    userService = new UserService(em);
    roleService = new RoleService(em);

    // Get the tenant IDs created by the container
    const testTenantIds = environment.postgresContainer?.getTestTenantIds();
    if (testTenantIds) {
      // Use the container-generated tenant IDs instead of our random ones
      TEST_TENANT_ID = testTenantIds.tenant1;
      OTHER_TENANT_ID = testTenantIds.tenant2;
    }
  }, 30000); // Increase timeout for container startup

  afterAll(async () => {
    // Shutdown module and ORM in a controlled manner
    try {
      // First close the testing module
      if (moduleRef) {
        await moduleRef.close();
      }

      // Then stop environment - this closes containers and connections
      await environment.stop();

      // Explicitly clear any open entity managers
      if (em) {
        em.clear();
      }
    } catch (error) {
      console.error('Error shutting down test environment:', error);
    }
  });

  beforeEach(async () => {
    // Clean the database before each test
    await environment.clearDatabase();

    // Set the tenant context
    environment.setTenantId(TEST_TENANT_ID);
  });

  it('should create a user with roles and verify tenant isolation', async () => {
    // Create roles for first tenant
    const adminRole = await roleService.createRole(
      {
        name: 'Admin',
        description: 'Administrator role',
      },
      TEST_TENANT_ID
    );

    const editorRole = await roleService.createRole(
      {
        name: 'Editor',
        description: 'Editor role',
      },
      TEST_TENANT_ID
    );

    // Create same roles for second tenant
    const otherTenantAdminRole = await roleService.createRole(
      {
        name: 'Admin',
        description: 'Administrator role',
      },
      OTHER_TENANT_ID
    );

    const otherTenantEditorRole = await roleService.createRole(
      {
        name: 'Editor',
        description: 'Editor role',
      },
      OTHER_TENANT_ID
    );

    // Create user in first tenant with roles
    const user = await userService.createUser(
      {
        email: 'admin@example.com',
        password: 'password123',
        profile: {
          firstName: 'Admin',
          lastName: 'User',
        },
        roles: [adminRole.id, editorRole.id],
      },
      TEST_TENANT_ID
    );

    // Create user in second tenant with same email but different roles
    const otherTenantUser = await userService.createUser(
      {
        email: 'admin@example.com',
        password: 'password123',
        profile: {
          firstName: 'Other',
          lastName: 'Admin',
        },
        roles: [otherTenantAdminRole.id],
      },
      OTHER_TENANT_ID
    );

    // Clear entity manager
    em.clear();

    // Verify user in first tenant has correct roles
    environment.setTenantId(TEST_TENANT_ID);
    const userWithRoles = await userRepository.findWithRoles(user.id, TEST_TENANT_ID);
    expect(userWithRoles).toBeDefined();
    expect(userWithRoles?.roles.isInitialized()).toBe(true);
    expect(userWithRoles?.roles.length).toBe(2);

    if (userWithRoles) {
      const roleNames = [...userWithRoles.roles].map((r) => r.name).sort();
      expect(roleNames).toEqual(['Admin', 'Editor']);
    }

    // Verify user in second tenant has correct roles
    environment.setTenantId(OTHER_TENANT_ID);
    const otherUserWithRoles = await userRepository.findWithRoles(
      otherTenantUser.id,
      OTHER_TENANT_ID
    );
    expect(otherUserWithRoles).toBeDefined();
    expect(otherUserWithRoles?.roles.isInitialized()).toBe(true);
    expect(otherUserWithRoles?.roles.length).toBe(1);

    if (otherUserWithRoles) {
      const roleNames = [...otherUserWithRoles.roles].map((r) => r.name);
      expect(roleNames).toEqual(['Admin']);
    }
  });

  it('should propagate role permission changes to all users with that role', async () => {
    // Create permissions
    const readPermission = em.create(Permission, {
      resource: 'articles',
      action: 'read',
    });

    const writePermission = em.create(Permission, {
      resource: 'articles',
      action: 'write',
    });

    const deletePermission = em.create(Permission, {
      resource: 'articles',
      action: 'delete',
    });

    await em.persistAndFlush([readPermission, writePermission, deletePermission]);

    // Create a role with initial permissions
    const editorRole = await roleService.createRole(
      {
        name: 'ContentEditor',
        description: 'Can edit content',
      },
      TEST_TENANT_ID
    );

    // Assign initial permissions (read, write)
    await roleService.assignPermissions(
      editorRole.id,
      [readPermission.id, writePermission.id],
      TEST_TENANT_ID
    );

    // Create multiple users with this role
    const user1 = await userService.createUser(
      {
        email: 'editor1@example.com',
        password: 'password123',
        profile: { firstName: 'Editor', lastName: 'One' },
        roles: [editorRole.id],
      },
      TEST_TENANT_ID
    );

    const user2 = await userService.createUser(
      {
        email: 'editor2@example.com',
        password: 'password123',
        profile: { firstName: 'Editor', lastName: 'Two' },
        roles: [editorRole.id],
      },
      TEST_TENANT_ID
    );

    // Clear entity manager
    em.clear();

    // Verify both users have the role with expected permissions
    for (const userId of [user1.id, user2.id]) {
      const userWithRoles = await userRepository.findWithRoles(userId, TEST_TENANT_ID);
      expect(userWithRoles).toBeDefined();

      if (userWithRoles) {
        // Get the editor role from the user
        const userEditorRole = [...userWithRoles.roles].find((r) => r.id === editorRole.id);
        expect(userEditorRole).toBeDefined();

        // Load the role with permissions
        const roleWithPerms = await roleRepository.findWithPermissions(
          editorRole.id,
          TEST_TENANT_ID
        );
        expect(roleWithPerms).toBeDefined();

        if (roleWithPerms) {
          const permActions = [...roleWithPerms.permissions].map((p) => p.action).sort();
          expect(permActions).toEqual(['read', 'write']);
        }
      }
    }

    // Now change the role permissions (remove write, add delete)
    await roleService.removePermissions(editorRole.id, [writePermission.id], TEST_TENANT_ID);
    await roleService.assignPermissions(editorRole.id, [deletePermission.id], TEST_TENANT_ID);

    em.clear();

    // Verify both users have updated permissions through the role
    for (const userId of [user1.id, user2.id]) {
      const userWithRoles = await userRepository.findWithRoles(userId, TEST_TENANT_ID);
      expect(userWithRoles).toBeDefined();

      if (userWithRoles) {
        // Get the editor role from the user
        const userEditorRole = [...userWithRoles.roles].find((r) => r.id === editorRole.id);
        expect(userEditorRole).toBeDefined();

        // Load the role with permissions
        const roleWithPerms = await roleRepository.findWithPermissions(
          editorRole.id,
          TEST_TENANT_ID
        );
        expect(roleWithPerms).toBeDefined();

        if (roleWithPerms) {
          const permActions = [...roleWithPerms.permissions].map((p) => p.action).sort();
          expect(permActions).toEqual(['delete', 'read']);
        }
      }
    }
  });

  it('should maintain tenant isolation when working with complex role hierarchies', async () => {
    // Timestamp hinzufügen, um eindeutige Rollennamen zu gewährleisten
    const timestamp = Date.now();
    const uniquePrefix = `${timestamp}_`;

    // Create a complex set of roles for first tenant
    const adminRole = await roleService.createRole(
      {
        name: `${uniquePrefix}Admin`,
        description: 'Administrator role',
      },
      TEST_TENANT_ID
    );

    const editorRole = await roleService.createRole(
      {
        name: `${uniquePrefix}Editor`,
        description: 'Content editor role',
      },
      TEST_TENANT_ID
    );

    const viewerRole = await roleService.createRole(
      {
        name: `${uniquePrefix}Viewer`,
        description: 'Content viewer role',
      },
      TEST_TENANT_ID
    );

    // Create similar roles in second tenant
    const otherTenantAdminRole = await roleService.createRole(
      {
        name: `${uniquePrefix}Admin`,
        description: 'Administrator role',
      },
      OTHER_TENANT_ID
    );

    const otherTenantEditorRole = await roleService.createRole(
      {
        name: `${uniquePrefix}Editor`,
        description: 'Content editor role',
      },
      OTHER_TENANT_ID
    );

    // Create users with roles in the first tenant
    const user1 = await userService.createUser(
      {
        email: 'admin@test.com',
        password: 'password123',
        profile: { firstName: 'Admin', lastName: 'User' },
        roles: [adminRole.id],
      },
      TEST_TENANT_ID
    );

    const user2 = await userService.createUser(
      {
        email: 'author@test.com',
        password: 'password123',
        profile: { firstName: 'Author', lastName: 'User' },
        roles: [editorRole.id, viewerRole.id],
      },
      TEST_TENANT_ID
    );

    // Create users with roles in the second tenant
    const otherAdminUser = await userService.createUser(
      {
        email: 'admin@test.com', // Same email, different tenant
        password: 'password123',
        profile: { firstName: 'Other', lastName: 'Admin' },
        roles: [otherTenantAdminRole.id],
      },
      OTHER_TENANT_ID
    );

    const otherAuthorUser = await userService.createUser(
      {
        email: 'author@test.com', // Same email, different tenant
        password: 'password123',
        profile: { firstName: 'Other', lastName: 'Author' },
        roles: [otherTenantEditorRole.id],
      },
      OTHER_TENANT_ID
    );

    // Verify tenant isolation with proper roles
    em.clear();

    // Set tenant context to first tenant
    environment.setTenantId(TEST_TENANT_ID);
    const tenant1AdminUser = await userRepository.findWithRoles(user1.id, TEST_TENANT_ID);
    expect(tenant1AdminUser).toBeDefined();

    if (tenant1AdminUser) {
      const roleNames = [...tenant1AdminUser.roles].map((r) => r.name);
      expect(roleNames).toContain(`${uniquePrefix}Admin`);
    }

    const tenant1AuthorUser = await userRepository.findWithRoles(user2.id, TEST_TENANT_ID);
    expect(tenant1AuthorUser).toBeDefined();

    if (tenant1AuthorUser) {
      const roleNames = [...tenant1AuthorUser.roles].map((r) => r.name);
      expect(roleNames).toContain(`${uniquePrefix}Editor`);
      expect(roleNames).toContain(`${uniquePrefix}Viewer`);
    }

    // Set tenant context to second tenant
    environment.setTenantId(OTHER_TENANT_ID);
    const tenant2AdminUser = await userRepository.findWithRoles(otherAdminUser.id, OTHER_TENANT_ID);
    expect(tenant2AdminUser).toBeDefined();

    if (tenant2AdminUser) {
      const roleNames = [...tenant2AdminUser.roles].map((r) => r.name);
      expect(roleNames).toContain(`${uniquePrefix}Admin`);
    }

    const tenant2AuthorUser = await userRepository.findWithRoles(
      otherAuthorUser.id,
      OTHER_TENANT_ID
    );
    expect(tenant2AuthorUser).toBeDefined();

    if (tenant2AuthorUser) {
      const roleNames = [...tenant2AuthorUser.roles].map((r) => r.name);
      expect(roleNames).toContain(`${uniquePrefix}Editor`);
    }

    // Cross-tenant verification - ensure users are isolated
    // Das Problem: Da wir in beiden Tenants Benutzer mit derselben E-Mail haben, müssen wir
    // sicherstellen, dass wir die Tenants explizit unterscheiden

    // Zuerst setzen wir den Kontext auf TEST_TENANT_ID
    environment.setTenantId(TEST_TENANT_ID);

    // Wir versuchen, den Benutzer aus dem OTHER_TENANT zu finden, indem wir direkt nach seiner ID suchen
    const wrongTenantUser = await userRepository.findOne({
      id: otherAdminUser.id,
      tenantId: TEST_TENANT_ID,
    });

    // Der Benutzer sollte nicht gefunden werden, da er im anderen Tenant existiert
    expect(wrongTenantUser).toBeNull();
  });
});
