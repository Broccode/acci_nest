import { Test } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/core';
import { UserService } from './user.service';
import { User, UserStatus } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { CreateUserDto, UpdateUserDto } from '../types/user.types';
import * as bcrypt from 'bcrypt';

// Manually mock bcrypt module
jest.spyOn(bcrypt, 'genSalt').mockResolvedValue('salt' as never);
jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_password' as never);
jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

describe('UserService', () => {
  let service: UserService;
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
        UserService,
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = moduleRef.get<UserService>(UserService);
    entityManager = moduleRef.get<EntityManager>(EntityManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      // Mock data
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        profile: {
          firstName: 'Test',
          lastName: 'User',
          preferredLanguage: 'en',
        },
      };

      const tenantId = 'tenant-1';
      
      const mockUser = Object.assign(new User(), {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed_password',
        tenantId,
        profile: {
          firstName: 'Test',
          lastName: 'User',
          preferredLanguage: 'en',
        },
        status: UserStatus.PENDING,
      });

      // Mock the EntityManager methods
      mockEntityManager.findOne.mockResolvedValue(null); // User doesn't exist yet
      mockEntityManager.create.mockReturnValue(mockUser);

      // Call the service method
      const result = await service.createUser(createUserDto, tenantId);

      // Assert the expected behavior
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(User, { email: createUserDto.email, tenantId });
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 'salt');
      expect(mockEntityManager.create).toHaveBeenCalledWith(User, {
        email: createUserDto.email,
        password: 'hashed_password',
        profile: createUserDto.profile,
        tenantId,
      });
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('should throw an error when user already exists', async () => {
      // Mock data
      const createUserDto: CreateUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        profile: {
          firstName: 'Existing',
          lastName: 'User',
          preferredLanguage: 'en',
        },
      };

      const tenantId = 'tenant-1';
      
      const existingUser = Object.assign(new User(), {
        id: 'existing-user',
        email: 'existing@example.com',
      });

      // Mock the EntityManager methods
      mockEntityManager.findOne.mockResolvedValue(existingUser); // User already exists

      // Assert the expected behavior
      await expect(service.createUser(createUserDto, tenantId)).rejects.toThrow('User with this email already exists');
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(User, { email: createUserDto.email, tenantId });
      expect(mockEntityManager.create).not.toHaveBeenCalled();
      expect(mockEntityManager.persistAndFlush).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should update an existing user successfully', async () => {
      // Mock data
      const userId = 'user-1';
      const updateUserDto: UpdateUserDto = {
        profile: {
          firstName: 'Updated',
          lastName: 'User',
        },
      };
      const tenantId = 'tenant-1';

      const existingUser = Object.assign(new User(), {
        id: userId,
        email: 'test@example.com',
        tenantId,
        profile: {
          firstName: 'Test',
          lastName: 'User',
          preferredLanguage: 'en',
        },
      });

      // Mock the EntityManager methods
      mockEntityManager.findOneOrFail.mockResolvedValue(existingUser);
      mockEntityManager.assign.mockImplementation((user, data) => {
        Object.assign(user, data);
        return user;
      });

      // Call the service method
      const result = await service.updateUser(userId, updateUserDto, tenantId);

      // Assert the expected behavior
      expect(mockEntityManager.findOneOrFail).toHaveBeenCalledWith(User, { id: userId, tenantId });
      expect(mockEntityManager.assign).toHaveBeenCalledWith(existingUser, updateUserDto);
      expect(mockEntityManager.flush).toHaveBeenCalled();
      expect(result.profile.firstName).toBe('Updated');
    });

    it('should hash password when updating password', async () => {
      // Mock data
      const userId = 'user-1';
      const updateUserDto: UpdateUserDto = {
        password: 'newpassword123',
      };
      const tenantId = 'tenant-1';

      const existingUser = Object.assign(new User(), {
        id: userId,
        email: 'test@example.com',
        password: 'old_hashed_password',
        tenantId,
      });

      // Mock the EntityManager methods
      mockEntityManager.findOneOrFail.mockResolvedValue(existingUser);
      mockEntityManager.assign.mockImplementation((user, data) => {
        Object.assign(user, data);
        return user;
      });

      // Call the service method
      await service.updateUser(userId, updateUserDto, tenantId);

      // Assert the expected behavior
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 'salt');
      expect(mockEntityManager.assign).toHaveBeenCalledWith(existingUser, {
        password: 'hashed_password',
      });
    });
  });

  describe('assignRoles', () => {
    it('should assign roles to a user', async () => {
      // Mock data
      const userId = 'user-1';
      const roleIds = ['role-1', 'role-2'];
      const tenantId = 'tenant-1';

      const mockUser = Object.assign(new User(), {
        id: userId,
        email: 'test@example.com',
        tenantId,
        roles: {
          add: jest.fn(),
          getItems: jest.fn().mockReturnValue([]),
        },
      });

      const mockRoles = [
        Object.assign(new Role(), { id: 'role-1', name: 'admin', tenantId }),
        Object.assign(new Role(), { id: 'role-2', name: 'user', tenantId }),
      ];

      // Mock the EntityManager methods
      mockEntityManager.findOne.mockResolvedValue(mockUser);
      mockEntityManager.find.mockResolvedValue(mockRoles);

      // Call the service method
      await service.assignRoles(userId, roleIds, tenantId);

      // Assert the expected behavior
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(User, { id: userId, tenantId }, { populate: ['roles'] });
      expect(mockEntityManager.find).toHaveBeenCalledWith(Role, { id: { $in: roleIds }, tenantId });
      expect(mockUser.roles.add).toHaveBeenCalledTimes(2);
      expect(mockEntityManager.flush).toHaveBeenCalled();
    });

    it('should throw an error when user is not found', async () => {
      // Mock data
      const userId = 'nonexistent-user';
      const roleIds = ['role-1'];
      const tenantId = 'tenant-1';

      // Mock the EntityManager methods
      mockEntityManager.findOne.mockResolvedValue(null);

      // Assert the expected behavior
      await expect(service.assignRoles(userId, roleIds, tenantId)).rejects.toThrow('User not found');
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(User, { id: userId, tenantId }, { populate: ['roles'] });
      expect(mockEntityManager.find).not.toHaveBeenCalled();
      expect(mockEntityManager.flush).not.toHaveBeenCalled();
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      
      const result = await service.validatePassword('correct_password', 'hashed_password');
      
      expect(bcrypt.compare).toHaveBeenCalledWith('correct_password', 'hashed_password');
      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      
      const result = await service.validatePassword('wrong_password', 'hashed_password');
      
      expect(bcrypt.compare).toHaveBeenCalledWith('wrong_password', 'hashed_password');
      expect(result).toBe(false);
    });
  });
}); 