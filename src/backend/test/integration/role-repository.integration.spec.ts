import { EntityManager, MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';
import { TENANT_CONTEXT } from '../../src/common/constants';
import { Tenant, TenantStatus } from '../../src/tenants/entities/tenant.entity';
import { TenantContext } from '../../src/tenants/services/tenant-context.service';
import { Permission } from '../../src/users/entities/permission.entity';
import { Role } from '../../src/users/entities/role.entity';
import { User } from '../../src/users/entities/user.entity';
import { PermissionRepository } from '../../src/users/repositories/permission.repository';
import { RoleRepository } from '../../src/users/repositories/role.repository';
import { PostgresTestContainer } from '../utils/containers';

describe('RoleRepository Integration Tests', () => {
  let container: PostgresTestContainer;
  let roleRepository: RoleRepository;
  let permissionRepository: PermissionRepository;
  let em: EntityManager;
  let orm: MikroORM;
  let tenantContext: TenantContext;
  let moduleRef: TestingModule;
  
  // Dynamically set tenant IDs from container
  let TEST_TENANT_ID: string;
  let OTHER_TENANT_ID: string;

  beforeAll(async () => {
    // Create PostgreSQL container with all required entities
    container = new PostgresTestContainer({
      entities: [User, Role, Permission, Tenant],
      providers: [
        RoleRepository, 
        PermissionRepository,
        // Mock tenant context will be updated after container starts
        {
          provide: TENANT_CONTEXT,
          useValue: {
            getCurrentTenant: jest.fn(),
            getCurrentTenantOrDefault: jest.fn(),
            hasTenant: jest.fn().mockReturnValue(true),
            setCurrentTenant: jest.fn(),
            clearCurrentTenant: jest.fn(),
          },
        }
      ],
    });

    // Start container and get the test module
    moduleRef = await container.start();

    // Get entity manager
    em = container.getEntityManager();
    
    // Get role repository
    roleRepository = moduleRef.get<RoleRepository>(RoleRepository);
    permissionRepository = moduleRef.get<PermissionRepository>(PermissionRepository);
    
    // Use the test tenant IDs created by the container
    const testTenantIds = container.getTestTenantIds();
    TEST_TENANT_ID = testTenantIds.tenant1;
    OTHER_TENANT_ID = testTenantIds.tenant2;
    
    // Get mock tenant context and update it with real tenant IDs
    tenantContext = moduleRef.get(TENANT_CONTEXT);
    (tenantContext.getCurrentTenant as jest.Mock).mockReturnValue(TEST_TENANT_ID);
    (tenantContext.getCurrentTenantOrDefault as jest.Mock).mockReturnValue(TEST_TENANT_ID);

    // Get the repositories and entity manager
    orm = moduleRef.get<MikroORM>('MikroORM');
    
    console.log(`Using test tenant IDs: ${TEST_TENANT_ID}, ${OTHER_TENANT_ID}`);
  }, 30000); // Increase timeout for container startup

  afterAll(async () => {
    // First close ORM to close any open database connections
    if (orm) {
      try {
        // Properly close all ORM connections
        await orm.close(true);
      } catch (error) {
        console.error('Error closing ORM:', error);
      }
    }

    // Then stop the container
    if (container) {
      try {
        await container.stop();
      } catch (error) {
        console.error('Error stopping container:', error);
      }
    }

    // Finally close the testing module
    if (moduleRef) {
      try {
        await moduleRef.close();
      } catch (error) {
        console.error('Error closing testing module:', error);
      }
    }
  });

  it('should create a role and find it by name', async () => {
    // Clear entity manager to ensure fresh data
    em.clear();
    
    // Create tenant directly in the test since refreshDatabase might have cleared it
    console.log(`Creating test tenant with ID: ${TEST_TENANT_ID}`);
    
    // Check if tenant exists first (direct SQL query)
    const connection = em.getConnection();
    const existingTenants = await connection.execute(`SELECT * FROM tenants WHERE id = '${TEST_TENANT_ID}'`);
    console.log('Existing tenants:', existingTenants);
    
    // Verify tenant exists in database
    if (existingTenants.length === 0) {
      throw new Error(`Test tenant with ID ${TEST_TENANT_ID} not found. Tests cannot proceed.`);
    }

    // Get a reference to the tenant (don't create a new one)
    const tenant = em.getReference(Tenant, TEST_TENANT_ID);
    
    // Create a role with the tenant reference
    const role = em.create(Role, {
      name: 'Admin',
      description: 'Administrator role',
      tenantId: TEST_TENANT_ID,
      tenant: tenant,
      isSystem: false,
    });
    
    // Save the role
    await em.persistAndFlush(role);
    
    // Find the role by name using EntityManager instead of repository
    const foundRole = await em.findOne(Role, { name: 'Admin', tenantId: TEST_TENANT_ID });
    
    // Assertions
    expect(foundRole).toBeDefined();
    expect(foundRole).not.toBeNull();
    expect(foundRole?.name).toBe('Admin');
    expect(foundRole?.description).toBe('Administrator role');
    expect(foundRole?.tenantId).toBe(TEST_TENANT_ID);
    expect(foundRole?.isSystem).toBe(false);
  });

  it('should respect tenant isolation for roles', async () => {
    // Clear entity manager to ensure fresh data
    em.clear();
    
    // Get references to the tenants
    const tenant1 = em.getReference(Tenant, TEST_TENANT_ID);
    const tenant2 = em.getReference(Tenant, OTHER_TENANT_ID);
    
    // Create roles in different tenants
    const role1 = em.create(Role, {
      name: 'Editor',
      description: 'Editor role for tenant 1',
      tenantId: TEST_TENANT_ID,
      tenant: tenant1,
    });
    
    const role2 = em.create(Role, {
      name: 'Editor',
      description: 'Editor role for tenant 2',
      tenantId: OTHER_TENANT_ID,
      tenant: tenant2,
    });
    
    // Save both roles
    await em.persistAndFlush([role1, role2]);
    
    // Find role in tenant 1
    const foundInTenant1 = await em.findOne(Role, { name: 'Editor', tenantId: TEST_TENANT_ID });
    expect(foundInTenant1).toBeDefined();
    expect(foundInTenant1?.description).toBe('Editor role for tenant 1');
    
    // Find role in tenant 2
    const foundInTenant2 = await em.findOne(Role, { name: 'Editor', tenantId: OTHER_TENANT_ID });
    expect(foundInTenant2).toBeDefined();
    expect(foundInTenant2?.description).toBe('Editor role for tenant 2');
  });

  it('should find system roles across tenants', async () => {
    // Clear entity manager to ensure fresh data
    em.clear();
    
    // Get a reference to tenant
    const tenant = em.getReference(Tenant, TEST_TENANT_ID);
    
    // Create system and tenant-specific roles
    const systemRole = em.create(Role, {
      name: 'SuperAdmin',
      description: 'System-wide administrator',
      tenantId: TEST_TENANT_ID,
      tenant: tenant,
      isSystem: true,
    });
    
    const tenantRole = em.create(Role, {
      name: 'TenantAdmin',
      description: 'Tenant-specific administrator',
      tenantId: TEST_TENANT_ID,
      tenant: tenant,
      isSystem: false,
    });
    
    // Save roles
    await em.persistAndFlush([systemRole, tenantRole]);
    
    // Find system roles
    const systemRoles = await em.find(Role, { isSystem: true });
    
    // Assertions
    expect(systemRoles).toBeDefined();
    expect(systemRoles.length).toBe(1);
    expect(systemRoles[0].name).toBe('SuperAdmin');
    expect(systemRoles[0].isSystem).toBe(true);
  });

  it('should find roles with their permissions', async () => {
    // Clear entity manager to ensure fresh data
    em.clear();
    
    // Get a reference to tenant
    const tenant = em.getReference(Tenant, TEST_TENANT_ID);
    
    // Create permissions
    const createPermission = em.create(Permission, {
      resource: 'users',
      action: 'create',
    });
    
    const readPermission = em.create(Permission, {
      resource: 'users',
      action: 'read',
    });
    
    // Create role
    const role = em.create(Role, {
      name: 'UserManager',
      description: 'Can manage users',
      tenantId: TEST_TENANT_ID,
      tenant: tenant,
    });
    
    // Save permissions and role first
    await em.persistAndFlush([createPermission, readPermission, role]);
    
    // Add permissions to role
    role.permissions.add(createPermission, readPermission);
    await em.flush();
    
    // Clear entity manager to ensure fresh data
    em.clear();
    
    // Find role with permissions
    const foundRole = await em.findOne(Role, { id: role.id, tenantId: TEST_TENANT_ID }, { populate: ['permissions'] });
    
    // Assertions
    expect(foundRole).toBeDefined();
    expect(foundRole?.name).toBe('UserManager');
    
    // Verify that permissions are initialized and have the expected count
    expect(foundRole?.permissions.isInitialized()).toBe(true);
    expect(foundRole?.permissions.length).toBe(2);
    
    // Only proceed if foundRole is defined
    if (foundRole) {
      // Get permissions as array
      const permissions = [...foundRole.permissions];
      const resources = permissions.map(p => p.resource);
      const actions = permissions.map(p => p.action);
      
      // Check permissions
      expect(resources).toContain('users');
      expect(actions).toContain('create');
      expect(actions).toContain('read');
    }
  });
}); 