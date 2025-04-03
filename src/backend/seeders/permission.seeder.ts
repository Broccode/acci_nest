import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { Permission } from '../src/users/entities/permission.entity';

/**
 * Permission Seeder
 *
 * @description Seeds the database with default permissions
 */
export class PermissionSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    console.log('Seeding permissions...');

    // User permissions
    em.create(Permission, { resource: 'users', action: 'create' });
    em.create(Permission, { resource: 'users', action: 'read' });
    em.create(Permission, { resource: 'users', action: 'update' });
    em.create(Permission, { resource: 'users', action: 'delete' });

    // Role permissions
    em.create(Permission, { resource: 'roles', action: 'create' });
    em.create(Permission, { resource: 'roles', action: 'read' });
    em.create(Permission, { resource: 'roles', action: 'update' });
    em.create(Permission, { resource: 'roles', action: 'delete' });

    // Tenant permissions
    em.create(Permission, { resource: 'tenants', action: 'create' });
    em.create(Permission, { resource: 'tenants', action: 'read' });
    em.create(Permission, { resource: 'tenants', action: 'update' });
    em.create(Permission, { resource: 'tenants', action: 'delete' });

    // Advanced permissions with conditions
    em.create(Permission, {
      resource: 'users',
      action: 'manage-roles',
      conditions: { requireAdmin: true },
    });

    em.create(Permission, {
      resource: 'system',
      action: 'access-admin',
      conditions: { requireAdmin: true },
    });

    console.log('Permissions seeded successfully!');
  }
}
