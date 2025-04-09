import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/core';
import { UnauthorizedException } from '@nestjs/common';
import { LdapAuthStrategy } from '../../strategies/ldap.strategy';
import { User, UserStatus } from '../../../users/entities/user.entity';
import { Tenant, TenantStatus } from '../../../tenants/entities/tenant.entity';
import { LdapUserProfile } from '../../types/ldap.types';

describe('LdapAuthStrategy', () => {
  let strategy: LdapAuthStrategy;
  let configService: jest.Mocked<ConfigService>;
  let entityManager: jest.Mocked<EntityManager>;

  const mockConfig = {
    'ldap.url': 'ldap://localhost:389',
    'ldap.bindDN': 'cn=admin,dc=example,dc=org',
    'ldap.bindCredentials': 'admin',
    'ldap.searchBase': 'dc=example,dc=org',
    'ldap.searchFilter': '(mail={{username}})',
    'ldap.tlsOptions.rejectUnauthorized': false,
    'ldap.useTLS': false,
    'ldap.defaultTenantId': 'tenant-1',
    'ldap.defaultTenantName': 'ldap',
    'ldap.defaultTenantDomain': 'ldap.domain',
  };

  const mockTenant: Partial<Tenant> = {
    id: 'tenant-1',
    name: 'ldap',
    domain: 'ldap.domain',
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
        LdapAuthStrategy,
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

    strategy = module.get<LdapAuthStrategy>(LdapAuthStrategy);
    configService = module.get(ConfigService);
    entityManager = module.get(EntityManager);
  });

  describe('constructor', () => {
    it('should configure strategy with correct options', () => {
      expect(configService.get).toHaveBeenCalledWith('ldap.url');
      expect(configService.get).toHaveBeenCalledWith('ldap.bindDN');
      expect(configService.get).toHaveBeenCalledWith('ldap.bindCredentials');
      expect(configService.get).toHaveBeenCalledWith('ldap.searchBase');
      expect(configService.get).toHaveBeenCalledWith('ldap.searchFilter');
    });
  });

  describe('validate', () => {
    const mockLdapUser: LdapUserProfile = {
      mail: 'test@example.com',
      displayName: 'Test User',
      givenName: 'Test',
      sn: 'User',
      sAMAccountName: 'testuser',
      memberOf: ['cn=users,dc=example,dc=org'],
    };

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
      const result = await strategy.validate(mockLdapUser);

      // Assert
      expect(entityManager.findOne).toHaveBeenCalledWith(Tenant, { id: mockConfig['ldap.defaultTenantId'] });
      expect(entityManager.findOne).toHaveBeenCalledWith(User, {
        email: 'test@example.com',
        tenantId: mockTenant.id,
      });
      expect(result).toEqual(mockUser);
      expect(entityManager.create).not.toHaveBeenCalled();
    });

    it('should create new user if not exists', async () => {
      // Arrange
      entityManager.findOne.mockImplementation(async (entity) => {
        if (entity === Tenant) return mockTenant;
        return null;
      });

      const createdUser = {
        ...mockUser,
        password: expect.stringMatching(/^[a-zA-Z0-9]{20,}$/),
      };

      entityManager.create.mockReturnValue(createdUser);

      // Act
      const result = await strategy.validate(mockLdapUser);

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
      expect(result).toEqual(createdUser);
    });

    it('should create default tenant if not exists', async () => {
      // Arrange
      entityManager.findOne.mockResolvedValue(null);
      
      const createdTenant = { ...mockTenant };
      const createdUser = { ...mockUser };

      entityManager.create.mockImplementation((entity, data) => {
        if (entity === Tenant) return createdTenant;
        if (entity === User) return createdUser;
        return null;
      });

      // Act
      const result = await strategy.validate(mockLdapUser);

      // Assert
      expect(entityManager.create).toHaveBeenCalledWith(Tenant, {
        name: mockConfig['ldap.defaultTenantName'],
        domain: mockConfig['ldap.defaultTenantDomain'],
        status: TenantStatus.ACTIVE,
      });
      expect(entityManager.persistAndFlush).toHaveBeenCalledWith(createdTenant);
      expect(result).toEqual(createdUser);
    });

    it('should throw UnauthorizedException when email is not provided', async () => {
      // Arrange
      const ldapUserWithoutEmail: LdapUserProfile = {
        displayName: 'Test User',
        givenName: 'Test',
        sn: 'User',
        sAMAccountName: '',
        memberOf: ['cn=users,dc=example,dc=org'],
      };

      // Act & Assert
      await expect(strategy.validate(ldapUserWithoutEmail)).rejects.toThrow(UnauthorizedException);
      expect(entityManager.findOne).not.toHaveBeenCalled();
    });

    it('should construct email from username if not provided', async () => {
      // Arrange
      const ldapUserWithoutEmail: LdapUserProfile = {
        displayName: 'Test User',
        givenName: 'Test',
        sn: 'User',
        sAMAccountName: 'testuser',
        memberOf: ['cn=users,dc=example,dc=org'],
      };

      entityManager.findOne.mockImplementation(async (entity) => {
        if (entity === Tenant) return mockTenant;
        return null;
      });

      const expectedEmail = 'testuser@ldap.domain';
      const createdUser = {
        ...mockUser,
        email: expectedEmail,
      };

      entityManager.create.mockReturnValue(createdUser);

      // Act
      const result = await strategy.validate(ldapUserWithoutEmail);

      // Assert
      expect(entityManager.create).toHaveBeenCalledWith(User, expect.objectContaining({
        email: expectedEmail,
      }));
      expect(result.email).toBe(expectedEmail);
    });

    it('should update user profile if name has changed', async () => {
      // Arrange
      const existingUser = {
        ...mockUser,
        profile: {
          firstName: 'Old',
          lastName: 'Name',
        },
      };

      entityManager.findOne.mockImplementation(async (entity) => {
        if (entity === Tenant) return mockTenant;
        if (entity === User) return existingUser;
        return null;
      });

      // Act
      const result = await strategy.validate(mockLdapUser);

      // Assert
      expect(result.profile.firstName).toBe('Test');
      expect(result.profile.lastName).toBe('User');
      expect(entityManager.flush).toHaveBeenCalled();
    });

    it('should handle errors during validation', async () => {
      // Arrange
      entityManager.findOne.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(strategy.validate(mockLdapUser)).rejects.toThrow(UnauthorizedException);
    });
  });
}); 