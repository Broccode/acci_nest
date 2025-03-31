import { EntityRepository, FilterQuery } from '@mikro-orm/core';
import { BaseRepository } from '../../common/repositories/base.repository';
import { Tenant, TenantStatus } from '../entities/tenant.entity';

export class TenantRepository extends BaseRepository<Tenant> {
  /**
   * Find a tenant by its domain
   */
  async findByDomain(domain: string): Promise<Tenant | null> {
    const filter: FilterQuery<Tenant> = { domain };
    return this.findOne(filter);
  }

  /**
   * Find all active tenants (not suspended or archived)
   */
  async findActive(): Promise<Tenant[]> {
    const filter: FilterQuery<Tenant> = {
      status: { $in: [TenantStatus.ACTIVE, TenantStatus.TRIAL] }
    };
    return this.find(filter);
  }

  /**
   * Check if a tenant is active
   */
  async isActive(id: string): Promise<boolean> {
    const tenant = await this.findById(id);
    return !!tenant && 
      (tenant.status === TenantStatus.ACTIVE || tenant.status === TenantStatus.TRIAL);
  }

  /**
   * Update tenant status
   */
  async updateStatus(id: string, status: TenantStatus): Promise<Tenant | null> {
    const tenant = await this.findById(id);
    if (!tenant) {
      return null;
    }
    
    tenant.status = status;
    await this.getEntityManager().persistAndFlush(tenant);
    return tenant;
  }
} 