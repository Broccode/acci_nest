import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../src/users/entities/user.entity';
import { Role } from '../src/users/entities/role.entity';
import { Tenant } from '../src/tenants/entities/tenant.entity';

/**
 * User Seeder
 * 
 * @description Seeds the database with default users for each tenant
 */
export class UserSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    console.log('Seeding users...');

    // Get all tenants
    const tenants = await em.find(Tenant, {});
    
    // Hash for a default password: 'Password123!'
    const defaultPassword = await this.hashPassword('Password123!');
    
    console.log(`Creating users for ${tenants.length} tenants...`);

    // For each tenant, create standard users
    for (const tenant of tenants) {
      // Get tenant roles
      const adminRole = await em.findOne(Role, { name: 'Admin', tenant });
      const userRole = await em.findOne(Role, { name: 'User', tenant });
      const managerRole = await em.findOne(Role, { name: 'Manager', tenant });
      
      if (!adminRole || !userRole || !managerRole) {
        console.error(`Roles not found for tenant ${tenant.name}. Skipping...`);
        continue;
      }
      
      // Create admin user
      const adminUser = em.create(User, {
        email: `admin@${tenant.domain}`,
        password: defaultPassword,
        profile: {
          firstName: 'Admin',
          lastName: 'User',
          preferredLanguage: 'en',
        },
        tenant,
        status: UserStatus.ACTIVE,
      });
      adminUser.roles.add(adminRole);
      
      // Create regular user
      const regularUser = em.create(User, {
        email: `user@${tenant.domain}`,
        password: defaultPassword,
        profile: {
          firstName: 'Regular',
          lastName: 'User',
          preferredLanguage: 'en',
        },
        tenant,
        status: UserStatus.ACTIVE,
      });
      regularUser.roles.add(userRole);
      
      // Create manager user
      const managerUser = em.create(User, {
        email: `manager@${tenant.domain}`,
        password: defaultPassword,
        profile: {
          firstName: 'Manager',
          lastName: 'User',
          preferredLanguage: 'en',
        },
        tenant,
        status: UserStatus.ACTIVE,
      });
      managerUser.roles.add(managerRole);
    }

    console.log('Users seeded successfully!');
  }
  
  /**
   * Hash a password
   * 
   * @param password Plain text password
   * @returns Hashed password
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }
} 