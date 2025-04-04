import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/core';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../../strategies/jwt.strategy';
import { User } from '../../../users/entities/user.entity';
import { Tenant, TenantStatus } from '../../../tenants/entities/tenant.entity';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;
  let entityManager: EntityManager;

  // Mock user and tenant data
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    tenantId: 'tenant-123',
  } as unknown as User;

  const mockTenant = {
    id: 'tenant-123',
    status: TenantStatus.ACTIVE,
  } as unknown as Tenant;

  beforeEach(async () => {
    // Create test module with mocked dependencies
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key, defaultValue) => {
              const config = {
                'jwt.secret': 'test-secret-key',
              };
              return config[key] !== undefined ? config[key] : defaultValue;
            }),
          },
        },
        {
          provide: EntityManager,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    // Get service instances
    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get<ConfigService>(ConfigService);
    entityManager = module.get<EntityManager>(EntityManager);
  });

  describe('validate', () => {
    it('should validate payload and return user data', async () => {
      // Arrange
      const payload = {
        sub: '123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        roles: ['user'],
      };
      jest.spyOn(entityManager, 'findOne').mockImplementation((entity, filter) => {
        if (entity === User) {
          return Promise.resolve(mockUser);
        } else if (entity === Tenant) {
          return Promise.resolve(mockTenant);
        }
        return Promise.resolve(null);
      });

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(entityManager.findOne).toHaveBeenCalledWith(User, { id: '123', tenantId: 'tenant-123' });
      expect(entityManager.findOne).toHaveBeenCalledWith(Tenant, { id: 'tenant-123' });
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      // Arrange
      const payload = {
        sub: '123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        roles: ['user'],
      };
      jest.spyOn(entityManager, 'findOne').mockImplementation((entity, filter) => {
        if (entity === User) {
          return Promise.resolve(null); // User not found
        } else if (entity === Tenant) {
          return Promise.resolve(mockTenant);
        }
        return Promise.resolve(null);
      });

      // Act & Assert
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      expect(entityManager.findOne).toHaveBeenCalledWith(User, { id: '123', tenantId: 'tenant-123' });
    });

    it('should throw UnauthorizedException when tenant is not found', async () => {
      // Arrange
      const payload = {
        sub: '123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        roles: ['user'],
      };
      jest.spyOn(entityManager, 'findOne').mockImplementation((entity, filter) => {
        if (entity === User) {
          return Promise.resolve(mockUser);
        } else if (entity === Tenant) {
          return Promise.resolve(null); // Tenant not found
        }
        return Promise.resolve(null);
      });

      // Act & Assert
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      expect(entityManager.findOne).toHaveBeenCalledWith(User, { id: '123', tenantId: 'tenant-123' });
      expect(entityManager.findOne).toHaveBeenCalledWith(Tenant, { id: 'tenant-123' });
    });

    it('should throw UnauthorizedException when tenant is inactive', async () => {
      // Arrange
      const payload = {
        sub: '123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        roles: ['user'],
      };
      const inactiveTenant = {
        ...mockTenant,
        status: TenantStatus.SUSPENDED,
      };
      jest.spyOn(entityManager, 'findOne').mockImplementation((entity, filter) => {
        if (entity === User) {
          return Promise.resolve(mockUser);
        } else if (entity === Tenant) {
          return Promise.resolve(inactiveTenant);
        }
        return Promise.resolve(null);
      });

      // Act & Assert
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      expect(entityManager.findOne).toHaveBeenCalledWith(User, { id: '123', tenantId: 'tenant-123' });
      expect(entityManager.findOne).toHaveBeenCalledWith(Tenant, { id: 'tenant-123' });
    });
  });
}); 