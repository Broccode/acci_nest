import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { PermissionSeeder } from './permission.seeder';
import { RoleSeeder } from './role.seeder';
import { UserSeeder } from './user.seeder';

/**
 * Database Seeder
 *
 * @description Main seeder that orchestrates all other seeders
 */
export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    console.log('Starting database seeding...');

    // Seeding order is important due to dependencies:
    // 1. Permissions (no dependencies)
    // 2. Roles (depends on permissions)
    // 3. Users (depends on roles)

    return this.call(em, [PermissionSeeder, RoleSeeder, UserSeeder]);
  }
}
