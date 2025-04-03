import { EntityManager } from '@mikro-orm/core';
import { Test } from '@nestjs/testing';
import { Permission } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';
import { CreateRoleDto, UpdateRoleDto } from '../types/user.types';
import { RoleService } from './role.service';

describe('RoleService', () => {
  let service: RoleService;
  let entityManager: EntityManager;

  const mockEntityManager = {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    assign: jest.fn(),
    persistAndFlush: jest.fn(),
    flush: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RoleService,
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = moduleRef.get<RoleService>(RoleService);
    entityManager = moduleRef.get<EntityManager>(EntityManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRole', () => {
    it('should create a new role successfully', async () => {
      // Mock data
      const createRoleDto: CreateRoleDto = {
        name: 'editor',
        description: 'Editor role with content management permissions',
      };

      const tenantId = 'tenant-1';

      const mockRole = Object.assign(new Role(), {
        id: 'role-1',
        name: 'editor',
        description: 'Editor role with content management permissions',
        tenantId,
        isSystem: false,
      });

      // Mock the EntityManager methods
      mockEntityManager.findOne.mockResolvedValue(null); // Role doesn't exist yet
      mockEntityManager.create.mockReturnValue(mockRole);

      // Call the service method
      const result = await service.createRole(createRoleDto, tenantId);

      // Assert the expected behavior
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(Role, {
        name: createRoleDto.name,
        tenantId,
      });
      expect(mockEntityManager.create).toHaveBeenCalledWith(Role, {
        name: createRoleDto.name,
        description: createRoleDto.description,
        tenantId,
      });
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith(mockRole);
      expect(result).toEqual(mockRole);
    });

    it('should throw an error when role already exists', async () => {
      // Mock data
      const createRoleDto: CreateRoleDto = {
        name: 'existing',
        description: 'Already exists',
      };

      const tenantId = 'tenant-1';

      const existingRole = Object.assign(new Role(), {
        id: 'existing-role',
        name: 'existing',
      });

      // Mock the EntityManager methods
      mockEntityManager.findOne.mockResolvedValue(existingRole); // Role already exists

      // Assert the expected behavior
      await expect(service.createRole(createRoleDto, tenantId)).rejects.toThrow(
        'Role with this name already exists'
      );
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(Role, {
        name: createRoleDto.name,
        tenantId,
      });
      expect(mockEntityManager.create).not.toHaveBeenCalled();
      expect(mockEntityManager.persistAndFlush).not.toHaveBeenCalled();
    });

    it('should assign permissions when provided', async () => {
      // Mock data
      const permissionIds = ['permission-1', 'permission-2'];
      const createRoleDto: CreateRoleDto = {
        name: 'editor',
        description: 'Editor role',
        permissions: permissionIds,
      };
      const tenantId = 'tenant-1';

      const mockRole = Object.assign(new Role(), {
        id: 'role-1',
        name: 'editor',
        description: 'Editor role',
        tenantId,
        isSystem: false,
        permissions: {
          add: jest.fn(),
          getItems: jest.fn().mockReturnValue([]),
        },
      });

      const mockPermissions = [
        Object.assign(new Permission(), {
          id: 'permission-1',
          resource: 'content',
          action: 'create',
        }),
        Object.assign(new Permission(), {
          id: 'permission-2',
          resource: 'content',
          action: 'update',
        }),
      ];

      // Mock the EntityManager methods
      mockEntityManager.findOne
        .mockResolvedValueOnce(null) // First call: Role doesn't exist yet
        .mockResolvedValueOnce(mockRole); // Second call: Find role for permission assignment
      mockEntityManager.create.mockReturnValue(mockRole);
      mockEntityManager.find.mockResolvedValue(mockPermissions);

      // Call the service method
      await service.createRole(createRoleDto, tenantId);

      // Assert the expected behavior
      expect(mockEntityManager.findOne).toHaveBeenCalledTimes(2);
      expect(mockEntityManager.find).toHaveBeenCalledWith(Permission, {
        id: { $in: permissionIds },
      });
      expect(mockRole.permissions.add).toHaveBeenCalledTimes(2);
      expect(mockEntityManager.flush).toHaveBeenCalled();
    });
  });

  describe('updateRole', () => {
    it('should update an existing role successfully', async () => {
      // Mock data
      const roleId = 'role-1';
      const updateRoleDto: UpdateRoleDto = {
        description: 'Updated description',
      };
      const tenantId = 'tenant-1';

      const existingRole = Object.assign(new Role(), {
        id: roleId,
        name: 'editor',
        description: 'Old description',
        tenantId,
        isSystem: false,
      });

      // Mock the EntityManager methods
      mockEntityManager.findOneOrFail.mockResolvedValue(existingRole);
      mockEntityManager.assign.mockImplementation((role, data) => {
        Object.assign(role, data);
        return role;
      });

      // Call the service method
      const result = await service.updateRole(roleId, updateRoleDto, tenantId);

      // Assert the expected behavior
      expect(mockEntityManager.findOneOrFail).toHaveBeenCalledWith(Role, { id: roleId, tenantId });
      expect(mockEntityManager.assign).toHaveBeenCalledWith(existingRole, updateRoleDto);
      expect(mockEntityManager.flush).toHaveBeenCalled();
      expect(result.description).toBe('Updated description');
    });

    it('should throw an error when trying to update a system role', async () => {
      // Mock data
      const roleId = 'system-role-1';
      const updateRoleDto: UpdateRoleDto = {
        description: 'Updated description',
      };
      const tenantId = 'tenant-1';

      const systemRole = Object.assign(new Role(), {
        id: roleId,
        name: 'admin',
        description: 'System admin role',
        tenantId,
        isSystem: true,
      });

      // Mock the EntityManager methods
      mockEntityManager.findOneOrFail.mockResolvedValue(systemRole);

      // Assert the expected behavior
      await expect(service.updateRole(roleId, updateRoleDto, tenantId)).rejects.toThrow(
        'System roles cannot be modified'
      );
      expect(mockEntityManager.findOneOrFail).toHaveBeenCalledWith(Role, { id: roleId, tenantId });
      expect(mockEntityManager.assign).not.toHaveBeenCalled();
      expect(mockEntityManager.flush).not.toHaveBeenCalled();
    });
  });

  describe('assignPermissions', () => {
    it('should assign permissions to a role', async () => {
      // Mock data
      const roleId = 'role-1';
      const permissionIds = ['permission-1', 'permission-2'];
      const tenantId = 'tenant-1';

      const mockRole = Object.assign(new Role(), {
        id: roleId,
        name: 'editor',
        tenantId,
        permissions: {
          add: jest.fn(),
          getItems: jest.fn().mockReturnValue([]),
        },
      });

      const mockPermissions = [
        Object.assign(new Permission(), {
          id: 'permission-1',
          resource: 'content',
          action: 'create',
        }),
        Object.assign(new Permission(), {
          id: 'permission-2',
          resource: 'content',
          action: 'update',
        }),
      ];

      // Mock the EntityManager methods
      mockEntityManager.findOne.mockResolvedValue(mockRole);
      mockEntityManager.find.mockResolvedValue(mockPermissions);

      // Call the service method
      await service.assignPermissions(roleId, permissionIds, tenantId);

      // Assert the expected behavior
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(
        Role,
        { id: roleId, tenantId },
        { populate: ['permissions'] }
      );
      expect(mockEntityManager.find).toHaveBeenCalledWith(Permission, {
        id: { $in: permissionIds },
      });
      expect(mockRole.permissions.add).toHaveBeenCalledTimes(2);
      expect(mockEntityManager.flush).toHaveBeenCalled();
    });

    it('should throw an error when role is not found', async () => {
      // Mock data
      const roleId = 'nonexistent-role';
      const permissionIds = ['permission-1'];
      const tenantId = 'tenant-1';

      // Mock the EntityManager methods
      mockEntityManager.findOne.mockResolvedValue(null);

      // Assert the expected behavior
      await expect(service.assignPermissions(roleId, permissionIds, tenantId)).rejects.toThrow(
        'Role not found'
      );
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(
        Role,
        { id: roleId, tenantId },
        { populate: ['permissions'] }
      );
      expect(mockEntityManager.find).not.toHaveBeenCalled();
      expect(mockEntityManager.flush).not.toHaveBeenCalled();
    });
  });

  describe('removePermissions', () => {
    it('should remove permissions from a role', async () => {
      // Mock data
      const roleId = 'role-1';
      const permissionIds = ['permission-1', 'permission-2'];
      const tenantId = 'tenant-1';

      const permission1 = Object.assign(new Permission(), {
        id: 'permission-1',
        resource: 'content',
        action: 'create',
      });
      const permission2 = Object.assign(new Permission(), {
        id: 'permission-2',
        resource: 'content',
        action: 'update',
      });

      const mockRole = Object.assign(new Role(), {
        id: roleId,
        name: 'editor',
        tenantId,
        isSystem: false,
        permissions: {
          remove: jest.fn(),
          getItems: jest.fn().mockReturnValue([permission1, permission2]),
        },
      });

      // Mock the EntityManager methods
      mockEntityManager.findOne.mockResolvedValue(mockRole);

      // Call the service method
      await service.removePermissions(roleId, permissionIds, tenantId);

      // Assert the expected behavior
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(
        Role,
        { id: roleId, tenantId },
        { populate: ['permissions'] }
      );
      expect(mockRole.permissions.remove).toHaveBeenCalledTimes(2);
      expect(mockEntityManager.flush).toHaveBeenCalled();
    });

    it('should throw an error when trying to modify permissions of a system role', async () => {
      // Mock data
      const roleId = 'system-role-1';
      const permissionIds = ['permission-1'];
      const tenantId = 'tenant-1';

      const systemRole = Object.assign(new Role(), {
        id: roleId,
        name: 'admin',
        tenantId,
        isSystem: true,
      });

      // Mock the EntityManager methods
      mockEntityManager.findOne.mockResolvedValue(systemRole);

      // Assert the expected behavior
      await expect(service.removePermissions(roleId, permissionIds, tenantId)).rejects.toThrow(
        'Permissions cannot be removed from system roles'
      );
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(
        Role,
        { id: roleId, tenantId },
        { populate: ['permissions'] }
      );
      expect(mockEntityManager.flush).not.toHaveBeenCalled();
    });
  });
});
