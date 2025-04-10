import { Test, TestingModule } from '@nestjs/testing';
import { BaseEntity } from '../entities/base.entity';
import { TENANT_CONTEXT } from '../constants';
import { TenantAwareRepository } from './tenant-aware.repository';
import { TenantContext } from '../../tenants/services/tenant-context.service';
import { createMockEntity, createMockEntities, createMockRepository, TestRepository } from '../testing/repository-test.utils';
import { BaseRepository } from './base.repository';

/**
 * @security OWASP:A1:2021 - Broken Access Control
 * @evidence SOC2:Security - Testing tenant data separation
 */
describe('TenantAwareRepository', () => {
  // Define a concrete implementation of TenantAwareRepository for testing
  class TestTenantAwareRepository<T extends BaseEntity> extends TenantAwareRepository<T> {}
  
  // Define test entity type
  interface TestEntity extends BaseEntity {
    name: string;
    tenantId: string;
  }

  let repository: TestTenantAwareRepository<TestEntity>;
  let mockBaseRepo: jest.Mocked<TestRepository<TestEntity>>;
  let tenantContext: TenantContext;

  // Current tenant for testing
  const currentTenantId = 'tenant-1';
  
  // Test data across tenants
  const tenant1Entities = createMockEntities<TestEntity>(3, (i) => ({
    name: `Tenant 1 - Entity ${i}`,
    tenantId: 'tenant-1',
  }));
  
  const tenant2Entities = createMockEntities<TestEntity>(2, (i) => ({
    name: `Tenant 2 - Entity ${i}`,
    tenantId: 'tenant-2',
  }));

  beforeEach(async () => {
    // Create mock base repository
    mockBaseRepo = createMockRepository<TestEntity>();
    
    // Add test data
    [...tenant1Entities, ...tenant2Entities].forEach(
      entity => mockBaseRepo._addEntity(entity)
    );

    // Configure module with mocks
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TestTenantAwareRepository,
          useClass: TestTenantAwareRepository,
        },
        {
          provide: TENANT_CONTEXT,
          useValue: {
            getCurrentTenant: jest.fn().mockReturnValue(currentTenantId),
          },
        },
      ],
    }).compile();

    // Get instances
    repository = module.get<TestTenantAwareRepository<TestEntity>>(TestTenantAwareRepository);
    tenantContext = module.get<TenantContext>(TENANT_CONTEXT);
    
    // Replace repository methods with mock implementation
    // Get BaseRepository method names by looking at prototype of BaseRepository
    const baseRepoMethods = ['find', 'findOne', 'count', 'findById', 'findByIds', 
      'exists', 'countEntities', 'findWithPagination', 'createAndSave', 'updateAndSave', 
      'deleteById', 'create', 'assign', 'getEntityManager'];
      
    // Copy mock methods to repository instance
    baseRepoMethods.forEach(method => {
      if (typeof mockBaseRepo[method] === 'function') {
        (repository as any)[method] = mockBaseRepo[method];
      }
    });
  });

  describe('findWithTenant', () => {
    it('should find only entities for the current tenant', async () => {
      // Act
      const result = await repository.findWithTenant();
      
      // Assert
      expect(mockBaseRepo.find).toHaveBeenCalledWith({ tenantId: currentTenantId });
    });

    it('should combine tenant filter with other filters', async () => {
      // Act
      await repository.findWithTenant({ name: 'Test' });
      
      // Assert
      expect(mockBaseRepo.find).toHaveBeenCalledWith({ 
        name: 'Test', 
        tenantId: currentTenantId 
      });
    });
  });

  describe('findOneWithTenant', () => {
    it('should find a single entity for the current tenant', async () => {
      // Act
      await repository.findOneWithTenant({ name: 'Test' });
      
      // Assert
      expect(mockBaseRepo.findOne).toHaveBeenCalledWith({ 
        name: 'Test', 
        tenantId: currentTenantId 
      });
    });
  });

  describe('countWithTenant', () => {
    it('should count only entities for the current tenant', async () => {
      // Act
      await repository.countWithTenant();
      
      // Assert
      expect(mockBaseRepo.count).toHaveBeenCalledWith({ tenantId: currentTenantId });
    });
  });

  describe('findWithTenantAndPagination', () => {
    it('should apply tenant filter to pagination queries', async () => {
      // Define mocked response for find
      const mockItems = tenant1Entities;
      const mockTotal = tenant1Entities.length;
      
      jest.spyOn(mockBaseRepo, 'find').mockResolvedValue(mockItems);
      jest.spyOn(mockBaseRepo, 'count').mockResolvedValue(mockTotal);
      
      // Act
      const result = await repository.findWithTenantAndPagination(1, 10);
      
      // Assert
      expect(mockBaseRepo.find).toHaveBeenCalledWith(
        { tenantId: currentTenantId },
        expect.objectContaining({
          limit: 10,
          offset: 0,
        })
      );
      
      expect(mockBaseRepo.count).toHaveBeenCalledWith({ tenantId: currentTenantId });
      expect(result.items).toEqual(mockItems);
      expect(result.total).toBe(mockTotal);
    });
  });

  describe('existsWithTenant', () => {
    it('should check existence only within current tenant', async () => {
      // Act
      await repository.existsWithTenant('entity-id');
      
      // Assert
      expect(mockBaseRepo.count).toHaveBeenCalledWith({ 
        id: 'entity-id', 
        tenantId: currentTenantId 
      });
    });
  });

  describe('tenant separation', () => {
    it('should prevent cross-tenant data access', async () => {
      // Set up repository to return actual filtered results
      jest.spyOn(mockBaseRepo, 'find').mockImplementation(async (where) => {
        // Return real entities based on tenantId filter
        const tenantId = (where as any).tenantId;
        if (tenantId === 'tenant-1') {
          return tenant1Entities;
        } else if (tenantId === 'tenant-2') {
          return tenant2Entities;
        }
        return [];
      });
      
      // Act - Request with current tenant (tenant-1)
      const result = await repository.findWithTenant();
      
      // Assert
      expect(result.length).toBe(tenant1Entities.length);
      expect(result).toEqual(expect.arrayContaining(tenant1Entities));
      // Should not include tenant-2 entities
      expect(result).not.toEqual(expect.arrayContaining(tenant2Entities));
    });
  });
}); 