import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/core';
import { PermissionRepository } from './permission.repository';
import { Permission } from '../entities/permission.entity';

describe('PermissionRepository', () => {
  let repository: PermissionRepository;
  let entityManager: EntityManager;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PermissionRepository,
        {
          provide: getRepositoryToken(Permission),
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
      ],
    }).compile();

    repository = moduleRef.get<PermissionRepository>(PermissionRepository);
    entityManager = moduleRef.get<EntityManager>(EntityManager);
  });

  describe('findByResourceAndAction', () => {
    it('should find a permission by resource and action', async () => {
      const mockPermission = new Permission();
      mockPermission.id = 'permission-1';
      mockPermission.resource = 'users';
      mockPermission.action = 'create';

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockPermission);

      const result = await repository.findByResourceAndAction('users', 'create');
      
      expect(repository.findOne).toHaveBeenCalledWith({ resource: 'users', action: 'create' });
      expect(result).toEqual(mockPermission);
    });

    it('should return null when permission is not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      const result = await repository.findByResourceAndAction('nonexistent', 'invalid');
      
      expect(repository.findOne).toHaveBeenCalledWith({ resource: 'nonexistent', action: 'invalid' });
      expect(result).toBeNull();
    });
  });

  describe('findForRole', () => {
    it('should find all permissions for a specific role', async () => {
      const mockPermissions = [
        Object.assign(new Permission(), { id: 'permission-1', resource: 'users', action: 'create' }),
        Object.assign(new Permission(), { id: 'permission-2', resource: 'users', action: 'update' }),
      ];

      jest.spyOn(repository, 'find').mockResolvedValue(mockPermissions);

      const result = await repository.findForRole('role-1');
      
      expect(repository.find).toHaveBeenCalledWith({ roles: { id: 'role-1' } });
      expect(result).toEqual(mockPermissions);
      expect(result.length).toBe(2);
    });

    it('should return empty array when no permissions are found', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue([]);

      const result = await repository.findForRole('role-without-permissions');
      
      expect(repository.find).toHaveBeenCalledWith({ roles: { id: 'role-without-permissions' } });
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });
}); 