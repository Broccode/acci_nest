import { FilterQuery, QueryOrderMap } from '@mikro-orm/core';
import { Inject } from '@nestjs/common';
import { TenantContext } from '../../tenants/services/tenant-context.service';
import { TENANT_CONTEXT } from '../constants';
import { BaseEntity } from '../entities/base.entity';
import { BaseRepository } from './base.repository';

/**
 * Repository that automatically applies tenant filtering to all queries
 */
export abstract class TenantAwareRepository<T extends BaseEntity> extends BaseRepository<T> {
  @Inject(TENANT_CONTEXT)
  protected readonly tenantContext: TenantContext;

  /**
   * Find entities with automatic tenant filtering
   */
  async findWithTenant(where: FilterQuery<T> = {}): Promise<T[]> {
    const tenantId = this.tenantContext.getCurrentTenant();
    const filter: FilterQuery<T> = { ...(where as object), tenantId } as FilterQuery<T>;
    return this.find(filter);
  }

  /**
   * Find a single entity with automatic tenant filtering
   */
  async findOneWithTenant(where: FilterQuery<T> = {}): Promise<T | null> {
    const tenantId = this.tenantContext.getCurrentTenant();
    const filter: FilterQuery<T> = { ...(where as object), tenantId } as FilterQuery<T>;
    return this.findOne(filter);
  }

  /**
   * Count entities with automatic tenant filtering
   */
  async countWithTenant(where: FilterQuery<T> = {}): Promise<number> {
    const tenantId = this.tenantContext.getCurrentTenant();
    const filter: FilterQuery<T> = { ...(where as object), tenantId } as FilterQuery<T>;
    return this.count(filter);
  }

  /**
   * Find entities with pagination and automatic tenant filtering
   */
  async findWithTenantAndPagination(
    page = 1,
    limit = 10,
    where: FilterQuery<T> = {},
    orderBy: QueryOrderMap<T> = { createdAt: 'DESC' } as QueryOrderMap<T>
  ): Promise<{ items: T[]; total: number; page: number; limit: number; pages: number }> {
    const tenantId = this.tenantContext.getCurrentTenant();
    const filter: FilterQuery<T> = { ...(where as object), tenantId } as FilterQuery<T>;

    const [items, total] = await Promise.all([
      this.find(filter, {
        limit,
        offset: (page - 1) * limit,
        orderBy,
      }),
      this.count(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Check if an entity with this ID exists for the current tenant
   */
  async existsWithTenant(id: string): Promise<boolean> {
    const tenantId = this.tenantContext.getCurrentTenant();
    const filter: FilterQuery<T> = { id, tenantId } as FilterQuery<T>;
    const count = await this.count(filter);
    return count > 0;
  }
}
