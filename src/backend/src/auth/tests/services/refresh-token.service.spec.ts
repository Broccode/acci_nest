import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EntityManager } from '@mikro-orm/core';
import { RefreshTokenService } from '../../services/refresh-token.service';
import { User } from '../../../users/entities/user.entity';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let entityManager: EntityManager;

  // Mock user data
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    tenantId: 'tenant-123',
    roles: {
      getItems: jest.fn().mockReturnValue([{ name: 'user' }]),
    },
  } as unknown as User;

  beforeEach(async () => {
    // Create test module with mocked dependencies
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mocked.jwt.token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key, defaultValue) => {
              const config = {
                'auth.refreshTokenExpiresIn': 604800, // 7 days in seconds
                'jwt.secret': 'test-secret',
              };
              return config[key] !== undefined ? config[key] : defaultValue;
            }),
          },
        },
        {
          provide: EntityManager,
          useValue: {
            fork: jest.fn(),
            flush: jest.fn(),
            clear: jest.fn(),
          },
        },
      ],
    }).compile();

    // Get service instances
    service = module.get<RefreshTokenService>(RefreshTokenService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    entityManager = module.get<EntityManager>(EntityManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear the internal token map between tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).refreshTokens.clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token with user information', async () => {
      // Arrange
      jest.spyOn(Date, 'now').mockReturnValue(1000000000000); // Fixed timestamp for testing
      const expectedExpiresAt = Math.floor(1000000000000 / 1000) + 604800;

      // Act
      const token = await service.generateRefreshToken(mockUser);

      // Assert
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(32); // Token should be reasonably long
      
      // Verify token data is stored internally
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenData = (service as any).refreshTokens.get(token);
      expect(tokenData).toBeDefined();
      expect(tokenData).toEqual({
        userId: '123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        roles: ['user'],
        expiresAt: expectedExpiresAt,
      });
    });
  });

  describe('validateRefreshToken', () => {
    it('should return token data for a valid token', async () => {
      // Arrange
      const token = await service.generateRefreshToken(mockUser);

      // Act
      const result = await service.validateRefreshToken(token);

      // Assert
      expect(result).toBeDefined();
      expect(result?.userId).toBe('123');
      expect(result?.email).toBe('test@example.com');
      expect(result?.tenantId).toBe('tenant-123');
      expect(result?.roles).toEqual(['user']);
    });

    it('should return null for an invalid token', async () => {
      // Act
      const result = await service.validateRefreshToken('invalid-token');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null and delete the token if expired', async () => {
      // Arrange
      // First generate a token
      const token = await service.generateRefreshToken(mockUser);
      
      // Manually set the token as expired
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenMap = (service as any).refreshTokens;
      const tokenData = tokenMap.get(token);
      tokenData.expiresAt = Math.floor(Date.now() / 1000) - 3600; // Expired 1 hour ago
      tokenMap.set(token, tokenData);

      // Act
      const result = await service.validateRefreshToken(token);

      // Assert
      expect(result).toBeNull();
      expect(tokenMap.has(token)).toBe(false); // Token should be deleted
    });
  });

  describe('revokeRefreshToken', () => {
    it('should remove the specified token', async () => {
      // Arrange
      const token = await service.generateRefreshToken(mockUser);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenMap = (service as any).refreshTokens;
      expect(tokenMap.has(token)).toBe(true);

      // Act
      await service.revokeRefreshToken(token);

      // Assert
      expect(tokenMap.has(token)).toBe(false);
    });

    it('should not throw when trying to revoke a non-existent token', async () => {
      // Act & Assert
      await expect(service.revokeRefreshToken('non-existent-token')).resolves.not.toThrow();
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for a specific user', async () => {
      // Arrange
      // Generate multiple tokens for the same user
      const token1 = await service.generateRefreshToken(mockUser);
      const token2 = await service.generateRefreshToken(mockUser);
      const token3 = await service.generateRefreshToken(mockUser);
      
      // Generate a token for a different user
      const anotherUser = { ...mockUser, id: '456' } as unknown as User;
      const token4 = await service.generateRefreshToken(anotherUser);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenMap = (service as any).refreshTokens;
      expect(tokenMap.size).toBe(4);

      // Act
      await service.revokeAllUserTokens('123');

      // Assert
      expect(tokenMap.has(token1)).toBe(false);
      expect(tokenMap.has(token2)).toBe(false);
      expect(tokenMap.has(token3)).toBe(false);
      expect(tokenMap.has(token4)).toBe(true); // This token belongs to a different user
      expect(tokenMap.size).toBe(1);
    });

    it('should not throw when user has no tokens', async () => {
      // Act & Assert
      await expect(service.revokeAllUserTokens('non-existent-user')).resolves.not.toThrow();
    });
  });
}); 