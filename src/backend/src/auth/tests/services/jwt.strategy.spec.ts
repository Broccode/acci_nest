import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../../strategies/jwt.strategy';
import { User } from '../../../users/entities/user.entity';
import { UserService } from '../../../users/services/user.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;
  let userService: UserService;

  // Mock user data
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    tenantId: 'tenant-123',
  } as unknown as User;

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
          provide: UserService,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    // Get service instances
    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get<ConfigService>(ConfigService);
    userService = module.get<UserService>(UserService);
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
      
      jest.spyOn(userService, 'findById').mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(userService.findById).toHaveBeenCalledWith('123', 'tenant-123');
      expect(result).toEqual({
        id: '123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        roles: ['user'],
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      // Arrange
      const payload = {
        sub: '123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        roles: ['user'],
      };
      
      jest.spyOn(userService, 'findById').mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      expect(userService.findById).toHaveBeenCalledWith('123', 'tenant-123');
    });
  });
}); 