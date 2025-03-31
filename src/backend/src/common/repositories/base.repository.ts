import { EntityRepository, FilterQuery, QueryOrderMap } from '@mikro-orm/core';
import { BaseEntity } from '../entities/base.entity';

/**
 * Base repository that provides common functionality for all entity repositories
 */
export abstract class BaseRepository<T extends BaseEntity> extends EntityRepository<T> {
  /**
   * Find an entity by its ID
   */
  async findById(id: string): Promise<T | null> {
    const filter = { id } as unknown as FilterQuery<T>;
    return this.findOne(filter);
  }

  /**
   * Find multiple entities by their IDs
   */
  async findByIds(ids: string[]): Promise<T[]> {
    const filter = { id: { $in: ids } } as unknown as FilterQuery<T>;
    return this.find(filter);
  }

  /**
   * Check if an entity with the given ID exists
   */
  async exists(id: string): Promise<boolean> {
    const filter = { id } as unknown as FilterQuery<T>;
    const count = await this.count(filter);
    return count > 0;
  }

  /**
   * Count entities that match the given condition
   */
  async countEntities(where: FilterQuery<T> = {}): Promise<number> {
    return this.count(where);
  }

  /**
   * Find all entities with pagination
   */
  async findWithPagination(
    page: number = 1,
    limit: number = 10,
    where: FilterQuery<T> = {},
    orderBy: QueryOrderMap<T> = { createdAt: 'DESC' } as unknown as QueryOrderMap<T>,
  ): Promise<{ items: T[]; total: number; page: number; limit: number; pages: number }> {
    const [items, total] = await Promise.all([
      this.find(where, {
        limit,
        offset: (page - 1) * limit,
        orderBy,
      }),
      this.count(where),
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
   * Create a new entity and persist it
   */
  async createAndSave(data: Partial<T>): Promise<T> {
    const entity = this.create(data as unknown as any);
    await this.getEntityManager().persistAndFlush(entity);
    return entity;
  }

  /**
   * Update an entity and persist changes
   */
  async updateAndSave(entity: T, data: Partial<T>): Promise<T> {
    this.assign(entity, data as unknown as any);
    await this.getEntityManager().persistAndFlush(entity);
    return entity;
  }

  /**
   * Delete an entity by its ID
   */
  async deleteById(id: string): Promise<boolean> {
    const entity = await this.findById(id);
    if (!entity) {
      return false;
    }
    await this.getEntityManager().removeAndFlush(entity);
    return true;
  }
} 