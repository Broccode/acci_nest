import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { Role } from '../src/users/entities/role.entity';
import { Permission } from '../src/users/entities/permission.entity';
import { Tenant } from '../src/tenants/entities/tenant.entity';

/**
 * Role Seeder
 * 
 * @description Seeds the database with default roles for each tenant
 */
export class RoleSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    console.log('Seeding roles...');

    // Get all tenants
    const tenants = await em.find(Tenant, {});
    
    // Get all permissions grouped by category
    const allPermissions = await em.find(Permission, {});
    const userPermissions = allPermissions.filter(p => p.resource === 'users');
    const basicUserPermissions = userPermissions.filter(p => p.action === 'read');
    const tenantReadPermissions = allPermissions.filter(p => p.resource === 'tenants' && p.action === 'read');
    
    console.log(`Creating roles for ${tenants.length} tenants...`);
    
    // For each tenant, create standard roles
    for (const tenant of tenants) {
      // Admin role with all permissions
      const adminRole = em.create(Role, {
        name: 'Admin',
        description: 'Administrator with full access',
        isSystem: true,
        tenant,
      });
      
      // User role with limited permissions
      const userRole = em.create(Role, {
        name: 'User',
        description: 'Standard user with limited access',
        isSystem: true,
        tenant,
      });
      
      // Manager role with intermediate permissions
      const managerRole = em.create(Role, {
        name: 'Manager',
        description: 'Manager with extended permissions',
        isSystem: true,
        tenant,
      });
      
      // Assign permissions
      for (const permission of allPermissions) {
        adminRole.permissions.add(permission);
      }
      
      for (const permission of basicUserPermissions) {
        userRole.permissions.add(permission);
      }
      
      for (const permission of tenantReadPermissions) {
        userRole.permissions.add(permission);
        managerRole.permissions.add(permission);
      }
      
      for (const permission of userPermissions) {
        managerRole.permissions.add(permission);
      }
    }

    console.log('Roles seeded successfully!');
  }
} 