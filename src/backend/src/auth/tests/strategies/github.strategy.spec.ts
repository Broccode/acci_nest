import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/core';
import { UnauthorizedException } from '@nestjs/common';
import { GithubStrategy } from '../../strategies/github.strategy';
import { User, UserStatus } from '../../../users/entities/user.entity';
import { Tenant, TenantStatus } from '../../../tenants/entities/tenant.entity';
import { Profile } from 'passport-github2';

describe('GithubStrategy', () => {
  let strategy: GithubStrategy;
  let configService: jest.Mocked<ConfigService>;
  let entityManager: jest.Mocked<EntityManager>;

  const mockConfig = {
    'oauth.github.clientId': 'mock-client-id',
    'oauth.github.clientSecret': 'mock-client-secret',
    'oauth.github.callbackUrl': 'mock-callback-url',
  };

  const mockTenant: Partial<Tenant> = {
    id: 'tenant-1',
    name: 'default',
    domain: 'default.domain',
    status: TenantStatus.ACTIVE,
  };

  const mockUser: Partial<User> = {
    id: 'user-1',
    email: 'test@example.com',
    tenantId: 'tenant-1',
    status: UserStatus.ACTIVE,
    profile: {
      firstName: 'Test',
      lastName: 'User',
      preferredLanguage: 'en',
    },
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => mockConfig[key]),
    };

    const mockEntityManager = {
      findOne: jest.fn(),
      create: jest.fn(),
      persistAndFlush: jest.fn().mockResolvedValue(undefined),
      flush: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    strategy = module.get<GithubStrategy>(GithubStrategy);
    configService = module.get(ConfigService);
    entityManager = module.get(EntityManager);
  });

  describe('constructor', () => {
    it('should configure strategy with correct options', () => {
      expect(configService.get).toHaveBeenCalledWith('oauth.github.clientId');
      expect(configService.get).toHaveBeenCalledWith('oauth.github.clientSecret');
      expect(configService.get).toHaveBeenCalledWith('oauth.github.callbackUrl');
    });
  });

  describe('validate', () => {
    const mockProfile: Partial<Profile> = {
      emails: [{ value: 'test@example.com' }],
      displayName: 'Test User',
      username: 'testuser',
    };

    const mockDone = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should validate and return existing user', async () => {
      // Arrange
      entityManager.findOne.mockImplementation(async (entity, criteria) => {
        if (entity === Tenant) return mockTenant;
        if (entity === User) return mockUser;
        return null;
      });

      // Act
      await strategy.validate('access-token', 'refresh-token', mockProfile as Profile, mockDone);

      // Assert
      expect(entityManager.findOne).toHaveBeenCalledWith(Tenant, { name: 'default' });
      expect(entityManager.findOne).toHaveBeenCalledWith(User, {
        email: 'test@example.com',
        tenantId: mockTenant.id,
      });
      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
      expect(entityManager.create).not.toHaveBeenCalled();
    });

    it('should create new user if not exists with secure random password', async () => {
      // Arrange
      entityManager.findOne.mockImplementation(async (entity) => {
        if (entity === Tenant) return mockTenant;
        return null;
      });

      const createdUser = {
        ...mockUser,
        password: expect.stringMatching(/^[a-zA-Z0-9]{13}$/),
      };

      entityManager.create.mockReturnValue(createdUser);

      // Act
      await strategy.validate('access-token', 'refresh-token', mockProfile as Profile, mockDone);

      // Assert
      expect(entityManager.create).toHaveBeenCalledWith(User, expect.objectContaining({
        email: 'test@example.com',
        tenant: mockTenant,
        tenantId: mockTenant.id,
        profile: {
          firstName: 'Test',
          lastName: 'User',
        },
        status: UserStatus.ACTIVE,
      }));
      expect(entityManager.persistAndFlush).toHaveBeenCalledWith(createdUser);
      expect(mockDone).toHaveBeenCalledWith(null, createdUser);
    });

    it('should handle profile without displayName', async () => {
      // Arrange
      const profileWithoutDisplayName: Partial<Profile> = {
        emails: [{ value: 'test@example.com' }],
        username: 'testuser',
      };
      entityManager.findOne.mockImplementation(async (entity) => {
        if (entity === Tenant) return mockTenant;
        return null;
      });

      // Act
      await strategy.validate('access-token', 'refresh-token', profileWithoutDisplayName as Profile, mockDone);

      // Assert
      expect(entityManager.create).toHaveBeenCalledWith(User, expect.objectContaining({
        profile: {
          firstName: 'testuser',
          lastName: '',
        },
      }));
    });

    it('should throw UnauthorizedException when email is not provided', async () => {
      // Arrange
      const profileWithoutEmail: Partial<Profile> = {
        emails: [],
        displayName: 'Test User',
        username: 'testuser',
      };

      // Act
      await strategy.validate('access-token', 'refresh-token', profileWithoutEmail as Profile, mockDone);

      // Assert
      expect(mockDone).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        null,
      );
      expect(entityManager.findOne).not.toHaveBeenCalled();
    });

    it('should handle errors during validation', async () => {
      // Arrange
      const error = new Error('Database error');
      entityManager.findOne.mockRejectedValue(error);

      // Act
      await strategy.validate('access-token', 'refresh-token', mockProfile as Profile, mockDone);

      // Assert
      expect(mockDone).toHaveBeenCalledWith(error, null);
    });

    it('should update user profile if name has changed', async () => {
      // Arrange
      const existingUser = {
        ...mockUser,
        profile: {
          firstName: 'OldFirst',
          lastName: 'OldLast',
          preferredLanguage: 'en',
        },
      };

      entityManager.findOne.mockImplementation(async (entity, criteria) => {
        if (entity === Tenant) return mockTenant;
        if (entity === User) return existingUser;
        return null;
      });

      // Act
      await strategy.validate('access-token', 'refresh-token', mockProfile as Profile, mockDone);

      // Assert
      expect(existingUser.profile.firstName).toBe('Test');
      expect(existingUser.profile.lastName).toBe('User');
      expect(entityManager.flush).toHaveBeenCalled();
    });
  });
}); 