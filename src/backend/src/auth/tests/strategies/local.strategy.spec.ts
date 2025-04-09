import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from '../../strategies/local.strategy';
import { AuthService } from '../../services/auth.service';
import { User, UserStatus } from '../../../users/entities/user.entity';
import { Request } from 'express';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: jest.Mocked<AuthService>;

  const mockUser: Partial<User> = {
    id: '1',
    email: 'test@example.com',
    status: UserStatus.ACTIVE,
    profile: {
      firstName: 'Test',
      lastName: 'User',
      preferredLanguage: 'en',
    },
  };

  beforeEach(async () => {
    // Create mock AuthService
    const mockAuthService = {
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get<jest.Mocked<AuthService>>(AuthService);
  });

  describe('validate', () => {
    const mockRequest = {
      body: {
        tenantId: 'tenant-123',
      },
    } as Request;

    const email = 'test@example.com';
    const password = 'password123';

    it('should successfully validate user with valid credentials', async () => {
      // Arrange
      authService.validateUser.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(mockRequest, email, password);

      // Assert
      expect(result).toBe(mockUser);
      expect(authService.validateUser).toHaveBeenCalledWith(
        email,
        password,
        'tenant-123',
      );
    });

    it('should throw UnauthorizedException when tenant ID is missing', async () => {
      // Arrange
      const requestWithoutTenant = {
        body: {},
      } as Request;

      // Act & Assert
      await expect(
        strategy.validate(requestWithoutTenant, email, password),
      ).rejects.toThrow(UnauthorizedException);
      expect(authService.validateUser).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user validation fails', async () => {
      // Arrange
      authService.validateUser.mockResolvedValue(null);

      // Act & Assert
      await expect(
        strategy.validate(mockRequest, email, password),
      ).rejects.toThrow(UnauthorizedException);
      expect(authService.validateUser).toHaveBeenCalledWith(
        email,
        password,
        'tenant-123',
      );
    });
  });
}); 