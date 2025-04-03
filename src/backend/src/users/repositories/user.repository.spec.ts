import { EntityManager } from '@mikro-orm/core';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { Test } from '@nestjs/testing';
import { TENANT_CONTEXT } from '../../common/constants';
import { TenantContext } from '../../tenants/services/tenant-context.service';
import { User } from '../entities/user.entity';
import { UserRepository } from './user.repository';

describe('UserRepository', () => {
  let repository: UserRepository;
  let entityManager: EntityManager;
  let tenantContext: TenantContext;

  const mockTenantContext = {
    getCurrentTenant: jest.fn().mockReturnValue('tenant-1'),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            nativeUpdate: jest.fn(),
          },
        },
        {
          provide: EntityManager,
          useValue: {
            findOne: jest.fn(),
            nativeUpdate: jest.fn(),
          },
        },
        {
          provide: TENANT_CONTEXT,
          useValue: mockTenantContext,
        },
      ],
    }).compile();

    repository = moduleRef.get<UserRepository>(UserRepository);
    entityManager = moduleRef.get<EntityManager>(EntityManager);
    tenantContext = moduleRef.get<TenantContext>(TENANT_CONTEXT);
  });

  describe('findByEmail', () => {
    it('should find a user by email within a tenant', async () => {
      const mockUser = new User();
      mockUser.id = 'user-1';
      mockUser.email = 'test@example.com';
      mockUser.tenantId = 'tenant-1';

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);

      const result = await repository.findByEmail('test@example.com', 'tenant-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
        tenantId: 'tenant-1',
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      const result = await repository.findByEmail('nonexistent@example.com', 'tenant-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        email: 'nonexistent@example.com',
        tenantId: 'tenant-1',
      });
      expect(result).toBeNull();
    });
  });

  describe('findWithRoles', () => {
    it('should find a user with roles loaded', async () => {
      const mockUser = new User();
      mockUser.id = 'user-1';
      mockUser.email = 'test@example.com';
      mockUser.tenantId = 'tenant-1';

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);

      const result = await repository.findWithRoles('user-1', 'tenant-1');

      expect(repository.findOne).toHaveBeenCalledWith(
        { id: 'user-1', tenantId: 'tenant-1' },
        { populate: ['roles'] }
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateLastLogin', () => {
    it('should update the lastLogin timestamp', async () => {
      const now = new Date();
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);
      jest.spyOn(repository, 'nativeUpdate').mockResolvedValue({ affectedRows: 1 } as any);

      await repository.updateLastLogin('user-1', 'tenant-1');

      expect(repository.nativeUpdate).toHaveBeenCalledWith(
        { id: 'user-1', tenantId: 'tenant-1' },
        { lastLogin: now }
      );
    });
  });
});
