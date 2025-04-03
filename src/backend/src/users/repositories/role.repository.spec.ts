import { EntityManager } from '@mikro-orm/core';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { Test } from '@nestjs/testing';
import { TENANT_CONTEXT } from '../../common/constants';
import { TenantContext } from '../../tenants/services/tenant-context.service';
import { Role } from '../entities/role.entity';
import { RoleRepository } from './role.repository';

describe('RoleRepository', () => {
  let repository: RoleRepository;
  let entityManager: EntityManager;
  let tenantContext: TenantContext;

  const mockTenantContext = {
    getCurrentTenant: jest.fn().mockReturnValue('tenant-1'),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RoleRepository,
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: EntityManager,
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: TENANT_CONTEXT,
          useValue: mockTenantContext,
        },
      ],
    }).compile();

    repository = moduleRef.get<RoleRepository>(RoleRepository);
    entityManager = moduleRef.get<EntityManager>(EntityManager);
    tenantContext = moduleRef.get<TenantContext>(TENANT_CONTEXT);
  });

  describe('findByName', () => {
    it('should find a role by name within a tenant', async () => {
      const mockRole = new Role();
      mockRole.id = 'role-1';
      mockRole.name = 'admin';
      mockRole.tenantId = 'tenant-1';

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockRole);

      const result = await repository.findByName('admin', 'tenant-1');

      expect(repository.findOne).toHaveBeenCalledWith({ name: 'admin', tenantId: 'tenant-1' });
      expect(result).toEqual(mockRole);
    });

    it('should return null when role is not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      const result = await repository.findByName('nonexistent', 'tenant-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        name: 'nonexistent',
        tenantId: 'tenant-1',
      });
      expect(result).toBeNull();
    });
  });

  describe('findSystemRoles', () => {
    it('should find all system roles', async () => {
      const mockRoles = [
        Object.assign(new Role(), { id: 'role-1', name: 'admin', isSystem: true }),
        Object.assign(new Role(), { id: 'role-2', name: 'user', isSystem: true }),
      ];

      jest.spyOn(repository, 'find').mockResolvedValue(mockRoles);

      const result = await repository.findSystemRoles();

      expect(repository.find).toHaveBeenCalledWith({ isSystem: true });
      expect(result).toEqual(mockRoles);
      expect(result.length).toBe(2);
    });
  });

  describe('findWithPermissions', () => {
    it('should find a role with permissions loaded', async () => {
      const mockRole = new Role();
      mockRole.id = 'role-1';
      mockRole.name = 'admin';
      mockRole.tenantId = 'tenant-1';

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockRole);

      const result = await repository.findWithPermissions('role-1', 'tenant-1');

      expect(repository.findOne).toHaveBeenCalledWith(
        { id: 'role-1', tenantId: 'tenant-1' },
        { populate: ['permissions'] }
      );
      expect(result).toEqual(mockRole);
    });
  });
});
