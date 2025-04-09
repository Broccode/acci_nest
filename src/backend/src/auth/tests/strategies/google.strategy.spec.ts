import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/core';
import { UnauthorizedException } from '@nestjs/common';
import { GoogleStrategy } from '../../strategies/google.strategy';
import { User, UserStatus } from '../../../users/entities/user.entity';
import { Tenant, TenantStatus } from '../../../tenants/entities/tenant.entity';
import { Profile } from 'passport-google-oauth20';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let configService: jest.Mocked<ConfigService>;
  let entityManager: jest.Mocked<EntityManager>;

  const mockConfig = {
    'oauth.google.clientId': 'mock-client-id',
    'oauth.google.clientSecret': 'mock-client-secret',
    'oauth.google.callbackUrl': 'mock-callback-url',
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
      persistAndFlush: jest.fn(),
      flush: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
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

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
    configService = module.get(ConfigService);
    entityManager = module.get(EntityManager);
  });

  describe('validate', () => {
    const mockProfile: Partial<Profile> = {
      emails: [{ value: 'test@example.com', verified: true }],
      name: {
        givenName: 'Test',
        familyName: 'User',
      },
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

    it('should create new user if not exists', async () => {
      // Arrange
      entityManager.findOne.mockImplementation(async (entity) => {
        if (entity === Tenant) return mockTenant;
        return null;
      });
      entityManager.create.mockImplementation((entity, data) => {
        if (entity === User) return mockUser;
        return null;
      });

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
      expect(entityManager.persistAndFlush).toHaveBeenCalled();
      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    it('should throw UnauthorizedException when email is not provided', async () => {
      // Arrange
      const profileWithoutEmail: Partial<Profile> = {
        emails: [],
        name: {
          givenName: 'Test',
          familyName: 'User',
        },
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
  });
}); 