import * as fs from 'fs';
import * as path from 'path';
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { Tenant, TenantStatus } from '../src/tenants/entities/tenant.entity';

// Partial type for seeding, MikroORM will handle timestamps automatically
interface TenantSeedData {
  name: string;
  domain: string;
  status: TenantStatus;
  plan: string;
  features: Array<{ name: string; limit: number }>;
  configuration: Record<string, any>;
}

/**
 * Seeder for tenant data
 */
export class TenantSeeder extends Seeder {
  /**
   * Load tenant seed data from configuration file or environment
   */
  private loadTenantSeedData(): TenantSeedData[] {
    // Try to load from seed data file if it exists
    const seedDataPath = path.resolve(__dirname, '../seed-data/tenants.json');

    try {
      if (fs.existsSync(seedDataPath)) {
        console.log(`Loading tenant data from ${seedDataPath}`);
        const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));
        return seedData;
      }
    } catch (error) {
      console.warn(`Could not load seed data from ${seedDataPath}:`, error);
    }

    // Default seed data if no file is found
    return [
      {
        name: 'Default Tenant',
        domain: 'default.acci-nest.local',
        status: TenantStatus.ACTIVE,
        plan: 'enterprise',
        features: [
          { name: 'users', limit: -1 },
          { name: 'projects', limit: -1 },
          { name: 'storage', limit: 1024 * 1024 * 1024 * 100 }, // 100GB
        ],
        configuration: {
          theme: {
            primaryColor: '#1976d2',
            secondaryColor: '#dc004e',
            darkMode: true,
          },
          security: {
            mfaEnabled: true,
            sessionTimeout: 3600,
            passwordPolicy: 'strong',
          },
          integrations: [
            { name: 'slack', enabled: true, config: { webhook: 'https://hooks.slack.com/demo' } },
            { name: 'github', enabled: true, config: { repo: 'acci-nest' } },
          ],
        },
      },
      {
        name: 'Developer Tenant',
        domain: 'dev.acci-nest.local',
        status: TenantStatus.TRIAL,
        plan: 'developer',
        features: [
          { name: 'users', limit: 5 },
          { name: 'projects', limit: 10 },
          { name: 'storage', limit: 1024 * 1024 * 1024 * 5 }, // 5GB
        ],
        configuration: {
          theme: {
            primaryColor: '#4caf50',
            secondaryColor: '#ff9800',
            darkMode: false,
          },
          security: {
            mfaEnabled: false,
            sessionTimeout: 7200,
            passwordPolicy: 'medium',
          },
        },
      },
    ];
  }

  /**
   * Seed tenant data
   */
  async run(em: EntityManager): Promise<void> {
    console.log('🌱 Seeding tenants...');

    const tenants = this.loadTenantSeedData();

    // Create tenant entities
    for (const tenantData of tenants) {
      const existingTenant = await em.findOne(Tenant, { domain: tenantData.domain });

      if (!existingTenant) {
        // MikroORM will handle the creation of timestamps
        const tenant = em.create(Tenant, tenantData as unknown as Tenant);
        em.persist(tenant);
        console.log(`Created tenant: ${tenant.name} (${tenant.domain})`);
      } else {
        console.log(`Tenant already exists: ${existingTenant.name} (${existingTenant.domain})`);
      }
    }

    // Flush to database
    await em.flush();
  }
}
