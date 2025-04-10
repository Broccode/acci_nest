import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/core';
import { MfaService } from './mfa.service';
import { User } from '../../users/entities/user.entity';
import * as OTPAuth from 'otpauth';
import { UserService } from '../../users/services/user.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Mock OTPAuth
jest.mock('otpauth', () => {
  return {
    TOTP: jest.fn().mockImplementation(() => ({
      validate: jest.fn(),
      toString: jest.fn().mockReturnValue('otpauth://totp/ACCI%20Nest:test@example.com?secret=ABC123'),
    })),
    Secret: {
      fromBase32: jest.fn().mockReturnValue('mocked-secret-value'),
    },
  };
});

// Mock qrcode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockedQRcodeImage'),
}));

describe('MfaService', () => {
  let service: MfaService;
  let configService: ConfigService;
  let entityManager: EntityManager;
  let mockUser: User;

  beforeEach(async () => {
    // Create mock user
    mockUser = {
      id: '123',
      email: 'test@example.com',
      tenantId: 'tenant-123',
      mfaSecret: null,
      mfaEnabled: false,
    } as unknown as User;

    // Create test module with mocked dependencies
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key, defaultValue) => {
              const config = {
                'app.name': 'ACCI Nest',
                'jwt.secret': 'test-secret-key',
              };
              return config[key] !== undefined ? config[key] : defaultValue;
            }),
          },
        },
        {
          provide: EntityManager,
          useValue: {
            findOneOrFail: jest.fn().mockResolvedValue(mockUser),
            flush: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    // Get service instances
    service = module.get<MfaService>(MfaService);
    configService = module.get<ConfigService>(ConfigService);
    entityManager = module.get<EntityManager>(EntityManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setupMfa', () => {
    it('should generate a secret and QR code for MFA setup', async () => {
      // Arrange
      jest.spyOn(service as any, 'generateSecret').mockReturnValue('ABC123');
      jest.spyOn(service as any, 'encryptSecret').mockReturnValue('encrypted-secret');

      // Act
      const result = await service.setupMfa('123', 'tenant-123');

      // Assert
      expect(entityManager.findOneOrFail).toHaveBeenCalledWith(User, { id: '123', tenantId: 'tenant-123' });
      expect(result).toEqual({
        secret: 'ABC123',
        qrCodeUrl: 'data:image/png;base64,mockedQRcodeImage',
      });
      expect(mockUser.mfaSecret).toBe('encrypted-secret');
      expect(entityManager.flush).toHaveBeenCalled();
      expect(OTPAuth.TOTP).toHaveBeenCalledWith({
        issuer: 'ACCI Nest',
        label: 'test@example.com',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: 'mocked-secret-value',
      });
    });
  });

  describe('verifyToken', () => {
    it('should return false if user has no MFA secret', async () => {
      // Arrange
      mockUser.mfaSecret = null;

      // Act
      const result = await service.verifyToken('123', '123456');

      // Assert
      expect(result).toBe(false);
    });

    it('should validate token and return false if invalid', async () => {
      // Arrange
      mockUser.mfaSecret = 'encrypted-secret';
      jest.spyOn(service as any, 'decryptSecret').mockReturnValue('ABC123');
      (OTPAuth.TOTP as unknown as jest.Mock).mockImplementation(() => ({
        validate: jest.fn().mockReturnValue(null), // Invalid token
      }));

      // Act
      const result = await service.verifyToken('123', '123456');

      // Assert
      expect(result).toBe(false);
      expect(mockUser.mfaEnabled).toBe(false); // Should not enable MFA
    });

    it('should validate token, enable MFA on first verification, and return true if valid', async () => {
      // Arrange
      mockUser.mfaSecret = 'encrypted-secret';
      mockUser.mfaEnabled = false;
      jest.spyOn(service as any, 'decryptSecret').mockReturnValue('ABC123');
      (OTPAuth.TOTP as unknown as jest.Mock).mockImplementation(() => ({
        validate: jest.fn().mockReturnValue(0), // Valid token with delta 0
      }));

      // Act
      const result = await service.verifyToken('123', '123456');

      // Assert
      expect(result).toBe(true);
      expect(mockUser.mfaEnabled).toBe(true); // Should enable MFA on first verification
      expect(entityManager.flush).toHaveBeenCalled();
    });

    it('should validate token but not enable MFA again if already enabled', async () => {
      // Arrange
      mockUser.mfaSecret = 'encrypted-secret';
      mockUser.mfaEnabled = true; // Already enabled
      jest.spyOn(service as any, 'decryptSecret').mockReturnValue('ABC123');
      (OTPAuth.TOTP as unknown as jest.Mock).mockImplementation(() => ({
        validate: jest.fn().mockReturnValue(0), // Valid token with delta 0
      }));
      jest.spyOn(entityManager, 'flush');

      // Act
      const result = await service.verifyToken('123', '123456');

      // Assert
      expect(result).toBe(true);
      expect(entityManager.flush).not.toHaveBeenCalled(); // Should not call flush if already enabled
    });
  });

  describe('disableMfa', () => {
    it('should disable MFA for a user', async () => {
      // Arrange
      mockUser.mfaEnabled = true;
      mockUser.mfaSecret = 'encrypted-secret';

      // Act
      await service.disableMfa('123', 'tenant-123');

      // Assert
      expect(entityManager.findOneOrFail).toHaveBeenCalledWith(User, { id: '123', tenantId: 'tenant-123' });
      expect(mockUser.mfaEnabled).toBe(false);
      expect(mockUser.mfaSecret).toBeNull();
      expect(entityManager.flush).toHaveBeenCalled();
    });
  });

  describe('encryption', () => {
    it('should encrypt and decrypt a secret correctly', () => {
      // Get private methods for testing
      const encryptSecret = (service as any).encryptSecret.bind(service);
      const decryptSecret = (service as any).decryptSecret.bind(service);

      // Test with a sample secret
      const originalSecret = 'ABCDEFGHIJKLMNOPQRST';
      const encrypted = encryptSecret(originalSecret);
      
      // Encrypted value should be different from original
      expect(encrypted).not.toBe(originalSecret);
      
      // Should be able to decrypt back to original
      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(originalSecret);
      
      // Encrypted should have the format "iv:encrypted"
      expect(encrypted).toContain(':');
      const [iv, encryptedPart] = encrypted.split(':');
      expect(iv).toBeDefined();
      expect(encryptedPart).toBeDefined();
    });
  });

  describe('generateSecret', () => {
    it('should generate a random base32 string', () => {
      // Get private method for testing
      const generateSecret = (service as any).generateSecret.bind(service);
      
      // Generate multiple secrets and check they're different
      const secret1 = generateSecret();
      const secret2 = generateSecret();
      
      // Each secret should be a string of reasonable length
      expect(typeof secret1).toBe('string');
      expect(secret1.length).toBeGreaterThan(20);
      
      // Should generate different values each time
      expect(secret1).not.toBe(secret2);
      
      // Should be a valid base32 string (only A-Z, 2-7 characters)
      expect(secret1).toMatch(/^[A-Z2-7]+$/);
    });
  });
}); 