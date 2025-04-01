import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { TenantSeeder } from './tenant.seeder';

/**
 * Main database seeder that coordinates all other seeders
 */
export class DatabaseSeeder extends Seeder {
  /**
   * Run all seeders in the appropriate order
   */
  async run(em: EntityManager): Promise<void> {
    // Return early in production to prevent accidental seeding
    if (process.env.NODE_ENV === 'production' && !process.env.FORCE_SEED) {
      console.warn('Seeding in production is disabled. Use FORCE_SEED=true to override.');
      return;
    }

    console.log('📝 Running database seeders...');
    
    // Run tenant seeder first since other entities may depend on tenants
    await this.call(em, [TenantSeeder]);
    
    // Add additional seeders here
    
    console.log('✅ Database seeding completed successfully');
  }
} 