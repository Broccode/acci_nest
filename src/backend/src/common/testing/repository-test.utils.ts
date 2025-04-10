import { FilterQuery, QueryOrderMap } from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';
import { BaseEntity } from '../entities/base.entity';
import { BaseRepository } from '../repositories/base.repository';

/**
 * @security OWASP:A5:2021 - Security Misconfiguration
 * @evidence SOC2:Security - Proper isolation of test data
 */

/**
 * Extended repository interface with test helper methods
 */
export interface TestRepository<T extends BaseEntity> extends BaseRepository<T> {
  /**
   * Get all entities in the mock repository
   */
  _getEntities(): T[];

  /**
   * Add an entity to the mock repository
   */
  _addEntity(entity: T): void;

  /**
   * Clear all entities from the mock repository
   */
  _clearEntities(): void;
}

/**
 * Creates a mock entity with default values
 * @param overrides - Properties to override in the default entity
 * @returns A mock entity with specified overrides
 */
export function createMockEntity<T extends BaseEntity>(overrides: Partial<T> = {}): T {
  const defaultEntity = {
    id: uuid(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as T;

  return { ...defaultEntity, ...overrides };
}

/**
 * Creates a collection of mock entities
 * @param count - Number of entities to create
 * @param factory - Function to customize each entity
 * @returns An array of mock entities
 */
export function createMockEntities<T extends BaseEntity>(
  count: number,
  factory: (index: number) => Partial<T> = () => ({})
): T[] {
  return Array.from({ length: count }, (_, i) => createMockEntity({ ...factory(i) }));
}

/**
 * Creates a mock base repository with controllable behavior
 * @returns A mock repository that can be used for testing
 */
export function createMockRepository<T extends BaseEntity>(): jest.Mocked<TestRepository<T>> {
  // In-memory storage for the mock repository
  const entities: Map<string, T> = new Map();

  const mockRepo = {
    // Find methods
    findById: jest.fn(async (id: string): Promise<T | null> => {
      return entities.get(id) || null;
    }),

    findByIds: jest.fn(async (ids: string[]): Promise<T[]> => {
      return ids.map((id) => entities.get(id)).filter(Boolean) as T[];
    }),

    findOne: jest.fn(async (where: FilterQuery<T>): Promise<T | null> => {
      // Simple implementation that just checks for ID
      if ('id' in where) {
        return entities.get(where.id as string) || null;
      }

      // For more complex queries, return the first matching entity
      return (
        Array.from(entities.values()).find((entity) =>
          Object.entries(where).every(
            ([key, value]) => (entity as Record<string, unknown>)[key] === value
          )
        ) || null
      );
    }),

    find: jest.fn(async (where: FilterQuery<T> = {}, options = {}): Promise<T[]> => {
      let results = Array.from(entities.values());

      // Basic filtering
      if (Object.keys(where).length > 0) {
        results = results.filter((entity) =>
          Object.entries(where).every(([key, value]) => {
            // Handle special case for $in operator
            if (key in entity && typeof value === 'object' && value !== null && '$in' in value) {
              return (value.$in as Array<unknown>).includes(
                (entity as Record<string, unknown>)[key]
              );
            }
            return (entity as Record<string, unknown>)[key] === value;
          })
        );
      }

      // Pagination
      if (options.offset !== undefined && options.limit !== undefined) {
        results = results.slice(options.offset, options.offset + options.limit);
      }

      // Sorting
      if (options.orderBy) {
        const orderBy = options.orderBy as QueryOrderMap<T>;
        results.sort((a, b) => {
          for (const [field, direction] of Object.entries(orderBy)) {
            const dir = direction === 'ASC' ? 1 : -1;
            const aValue = (a as Record<string, unknown>)[field];
            const bValue = (b as Record<string, unknown>)[field];

            if (aValue < bValue) return -1 * dir;
            if (aValue > bValue) return 1 * dir;
          }
          return 0;
        });
      }

      return results;
    }),

    // Write methods
    createAndSave: jest.fn(async (data: Partial<T>): Promise<T> => {
      const entity = createMockEntity(data);
      entities.set(entity.id, entity);
      return entity;
    }),

    updateAndSave: jest.fn(async (entity: T, data: Partial<T>): Promise<T> => {
      const updated = { ...entity, ...data, updatedAt: new Date() };
      entities.set(entity.id, updated as T);
      return updated as T;
    }),

    deleteById: jest.fn(async (id: string): Promise<boolean> => {
      if (!entities.has(id)) return false;
      entities.delete(id);
      return true;
    }),

    // Count methods
    count: jest.fn(async (where: FilterQuery<T> = {}): Promise<number> => {
      if (Object.keys(where).length === 0) {
        return entities.size;
      }

      return Array.from(entities.values()).filter((entity) =>
        Object.entries(where).every(([key, value]) => {
          // Handle special case for $in operator
          if (key in entity && typeof value === 'object' && value !== null && '$in' in value) {
            return (value.$in as Array<unknown>).includes((entity as Record<string, unknown>)[key]);
          }
          return (entity as Record<string, unknown>)[key] === value;
        })
      ).length;
    }),

    countEntities: jest.fn(async (where: FilterQuery<T> = {}): Promise<number> => {
      return mockRepo.count(where);
    }),

    // Pagination method
    findWithPagination: jest.fn(
      async (
        page = 1,
        limit = 10,
        where: FilterQuery<T> = {},
        orderBy: QueryOrderMap<T> = { createdAt: 'DESC' } as QueryOrderMap<T>
      ) => {
        const offset = (page - 1) * limit;
        const items = await mockRepo.find(where, { limit, offset, orderBy });
        const total = await mockRepo.count(where);

        return {
          items,
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        };
      }
    ),

    // MikroORM specific methods
    create: jest.fn((data: Partial<T>) => createMockEntity(data)),

    assign: jest.fn((entity: T, data: Partial<T>) => {
      return { ...entity, ...data };
    }),

    getEntityManager: jest.fn(() => ({
      persistAndFlush: jest.fn(async () => {}),
      removeAndFlush: jest.fn(async () => {}),
      flush: jest.fn(async () => {}),
    })),

    // Utility methods for testing
    _getEntities: jest.fn(() => Array.from(entities.values())),
    _addEntity: jest.fn((entity: T) => entities.set(entity.id, entity)),
    _clearEntities: jest.fn(() => entities.clear()),
  } as unknown as jest.Mocked<TestRepository<T>>;

  return mockRepo;
}
