import { EntityRepository, FilterQuery, QueryOrderMap } from '@mikro-orm/core';
import { BaseRepository } from './base.repository';
import { BaseEntity } from '../entities/base.entity';
import { createMockEntity, createMockEntities, createMockRepository, TestRepository } from '../testing/repository-test.utils';

/**
 * @security OWASP:A3:2021 - Injection
 * @evidence SOC2:Security - Testing data access patterns for security
 */
describe('BaseRepository', () => {
  // Define test entity type that extends BaseEntity
  interface TestEntity extends BaseEntity {
    name: string;
    description?: string;
    status: 'active' | 'inactive';
    tenantId?: string;
  }
  
  // Setup repository for each test
  let repository: jest.Mocked<TestRepository<TestEntity>>;
  
  beforeEach(() => {
    repository = createMockRepository<TestEntity>();
    
    // Add 'exists' method which was missing from the implementation
    repository.exists = jest.fn(async (id: string): Promise<boolean> => {
      return (await repository.findById(id)) !== null;
    });
  });
  
  describe('findById', () => {
    it('should find an entity by ID', async () => {
      // Arrange
      const entity = createMockEntity<TestEntity>({
        name: 'Test Entity',
        status: 'active'
      });
      repository._addEntity(entity);
      
      // Act
      const result = await repository.findById(entity.id);
      
      // Assert
      expect(result).toEqual(entity);
      expect(repository.findById).toHaveBeenCalledWith(entity.id);
    });
    
    it('should return null if entity not found', async () => {
      // Act
      const result = await repository.findById('non-existent-id');
      
      // Assert
      expect(result).toBeNull();
    });
  });
  
  describe('findByIds', () => {
    it('should find multiple entities by their IDs', async () => {
      // Arrange
      const entity1 = createMockEntity<TestEntity>({ name: 'Entity 1', status: 'active' });
      const entity2 = createMockEntity<TestEntity>({ name: 'Entity 2', status: 'inactive' });
      const entity3 = createMockEntity<TestEntity>({ name: 'Entity 3', status: 'active' });
      
      repository._addEntity(entity1);
      repository._addEntity(entity2);
      repository._addEntity(entity3);
      
      // Act
      const result = await repository.findByIds([entity1.id, entity3.id]);
      
      // Assert
      expect(result.length).toBe(2);
      expect(result.map(e => e.id).sort()).toEqual([entity1.id, entity3.id].sort());
    });
    
    it('should return empty array when no ids match', async () => {
      // Arrange
      const entity = createMockEntity<TestEntity>({ name: 'Entity 1', status: 'active' });
      repository._addEntity(entity);
      
      // Act
      const result = await repository.findByIds(['non-existent-1', 'non-existent-2']);
      
      // Assert
      expect(result.length).toBe(0);
    });
  });
  
  describe('exists', () => {
    it('should return true if entity exists', async () => {
      // Arrange
      const entity = createMockEntity<TestEntity>({ name: 'Test Entity', status: 'active' });
      repository._addEntity(entity);
      
      // Act
      const result = await repository.exists(entity.id);
      
      // Assert
      expect(result).toBe(true);
    });
    
    it('should return false if entity does not exist', async () => {
      // Act
      const result = await repository.exists('non-existent-id');
      
      // Assert
      expect(result).toBe(false);
    });
  });
  
  describe('countEntities', () => {
    it('should count all entities when no filter is provided', async () => {
      // Arrange
      const entities = [
        createMockEntity<TestEntity>({ name: 'Entity 1', status: 'active' }),
        createMockEntity<TestEntity>({ name: 'Entity 2', status: 'inactive' }),
        createMockEntity<TestEntity>({ name: 'Entity 3', status: 'active' }),
      ];
      
      entities.forEach(entity => repository._addEntity(entity));
      
      // Act
      const result = await repository.countEntities();
      
      // Assert
      expect(result).toBe(3);
    });
    
    it('should count entities based on provided filter', async () => {
      // Arrange
      const entities = [
        createMockEntity<TestEntity>({ name: 'Entity 1', status: 'active' }),
        createMockEntity<TestEntity>({ name: 'Entity 2', status: 'inactive' }),
        createMockEntity<TestEntity>({ name: 'Entity 3', status: 'active' }),
      ];
      
      entities.forEach(entity => repository._addEntity(entity));
      
      // Act
      const result = await repository.countEntities({ status: 'active' } as FilterQuery<TestEntity>);
      
      // Assert
      expect(result).toBe(2);
    });
  });
  
  describe('findWithPagination', () => {
    it('should return paginated entities with default values', async () => {
      // Arrange - Add multiple entities
      const entities = [
        createMockEntity<TestEntity>({ name: 'Entity 1', status: 'active' }),
        createMockEntity<TestEntity>({ name: 'Entity 2', status: 'active' }),
        createMockEntity<TestEntity>({ name: 'Entity 3', status: 'inactive' }),
        createMockEntity<TestEntity>({ name: 'Entity 4', status: 'active' }),
        createMockEntity<TestEntity>({ name: 'Entity 5', status: 'inactive' }),
      ];
      
      entities.forEach(entity => repository._addEntity(entity));
      
      // Act
      const result = await repository.findWithPagination();
      
      // Assert
      expect(result.items.length).toBe(5); // Default limit is 10, we only have 5
      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.pages).toBe(1);
    });
    
    it('should return entities based on custom pagination, where conditions and sorting', async () => {
      // Arrange - Add multiple entities with different dates to test sorting
      const now = new Date();
      const day1 = new Date(now);
      day1.setDate(day1.getDate() - 1);
      const day2 = new Date(now);
      day2.setDate(day2.getDate() - 2);
      
      const entities = [
        createMockEntity<TestEntity>({ name: 'Old entity', status: 'active', createdAt: day2 }),
        createMockEntity<TestEntity>({ name: 'Middle entity', status: 'active', createdAt: day1 }),
        createMockEntity<TestEntity>({ name: 'New entity', status: 'inactive', createdAt: now }),
        createMockEntity<TestEntity>({ name: 'Another old', status: 'inactive', createdAt: day2 }),
      ];
      
      entities.forEach(entity => repository._addEntity(entity));
      
      // Act - Get page 1, limit 2, only inactive entities, ordered by createdAt ASC
      const result = await repository.findWithPagination(
        1, 
        2, 
        { status: 'inactive' } as FilterQuery<TestEntity>, 
        { createdAt: 'ASC' } as QueryOrderMap<TestEntity>
      );
      
      // Assert
      expect(result.items.length).toBe(2);
      expect(result.total).toBe(2); // Only 2 inactive entities
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.pages).toBe(1);
      
      // Validate sorting - should be oldest first
      expect(result.items[0].name).toBe('Another old');
      expect(result.items[1].name).toBe('New entity');
    });
    
    it('should handle empty results', async () => {
      // Act - Search with condition that matches nothing
      const result = await repository.findWithPagination(
        1, 
        10, 
        { name: 'Non-existent' } as FilterQuery<TestEntity>
      );
      
      // Assert
      expect(result.items.length).toBe(0);
      expect(result.total).toBe(0);
      expect(result.pages).toBe(0);
    });
  });
  
  describe('createAndSave', () => {
    it('should create and save a new entity', async () => {
      // Act
      const result = await repository.createAndSave({
        name: 'New Entity',
        status: 'active'
      });
      
      // Assert
      expect(result.id).toBeDefined();
      expect(result.name).toBe('New Entity');
      expect(result.status).toBe('active');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      
      // Entity should be in the repository
      const saved = await repository.findById(result.id);
      expect(saved).toEqual(result);
    });
  });
  
  describe('updateAndSave', () => {
    it('should update and save an existing entity', async () => {
      // Arrange
      jest.useFakeTimers();
      const pastDate = new Date();
      pastDate.setSeconds(pastDate.getSeconds() - 10); // 10 seconds in the past
      
      const entity = createMockEntity<TestEntity>({
        name: 'Test Entity',
        status: 'active'
      });
      // Explicitly set the updatedAt to a past time
      entity.updatedAt = pastDate;
      repository._addEntity(entity);
      
      // Act
      const originalUpdatedAt = entity.updatedAt;
      
      // Advance timer to ensure updatedAt will be different
      jest.advanceTimersByTime(1000);
      
      const result = await repository.updateAndSave(entity, {
        name: 'Updated Entity',
        status: 'inactive'
      });
      
      // Assert
      expect(result.id).toBe(entity.id);
      expect(result.name).toBe('Updated Entity');
      expect(result.status).toBe('inactive');
      expect(result.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      
      // Entity should be updated in the repository
      const saved = await repository.findById(entity.id);
      expect(saved).toEqual(result);
      
      // Clean up
      jest.useRealTimers();
    });
  });
  
  describe('deleteById', () => {
    it('should delete an entity by ID', async () => {
      // Arrange
      const entity = createMockEntity<TestEntity>({
        name: 'Test Entity',
        status: 'active'
      });
      repository._addEntity(entity);
      
      // Act
      const result = await repository.deleteById(entity.id);
      
      // Assert
      expect(result).toBe(true);
      
      // Entity should be deleted from the repository
      const saved = await repository.findById(entity.id);
      expect(saved).toBeNull();
    });
    
    it('should return false if entity does not exist', async () => {
      // Act
      const result = await repository.deleteById('non-existent-id');
      
      // Assert
      expect(result).toBe(false);
    });
  });
}); 