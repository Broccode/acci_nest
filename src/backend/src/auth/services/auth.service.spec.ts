import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserService } from '../../users/services/user.service';
import { RefreshTokenService } from './refresh-token.service';
import { MfaService } from './mfa.service';
import { User } from '../../users/entities/user.entity';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let jwtService: JwtService;
  let refreshTokenService: RefreshTokenService;
  let mfaService: MfaService;

  // Mock user data
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    password: 'hashedPassword',
    tenantId: 'tenant-123',
    mfaEnabled: false,
    roles: {
      getItems: jest.fn().mockReturnValue([{ name: 'user' }]),
    },
  } as unknown as User;

  // Mock user without password for validation results
  const mockUserResult = {
    id: '123',
    email: 'test@example.com',
    tenantId: 'tenant-123',
    mfaEnabled: false,
    roles: {
      getItems: jest.fn().mockReturnValue([{ name: 'user' }]),
    },
  } as unknown as User;

  beforeEach(async () => {
    // Create test module with mocked dependencies
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            findByEmail: jest.fn(),
            validatePassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mocked.jwt.token'),
          },
        },
        {
          provide: RefreshTokenService,
          useValue: {
            generateRefreshToken: jest.fn().mockResolvedValue('mocked-refresh-token'),
          },
        },
        {
          provide: MfaService,
          useValue: {
            verifyToken: jest.fn(),
          },
        },
      ],
    }).compile();

    // Get service instances
    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
    refreshTokenService = module.get<RefreshTokenService>(RefreshTokenService);
    mfaService = module.get<MfaService>(MfaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      // Arrange
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(userService, 'validatePassword').mockResolvedValue(true);

      // Act
      const result = await service.validateUser('test@example.com', 'password', 'tenant-123');

      // Assert
      expect(userService.findByEmail).toHaveBeenCalledWith('test@example.com', 'tenant-123');
      expect(userService.validatePassword).toHaveBeenCalledWith('password', 'hashedPassword');
      expect(result).toEqual(expect.objectContaining({
        id: '123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
      }));
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user is not found', async () => {
      // Arrange
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(null);

      // Act
      const result = await service.validateUser('nonexistent@example.com', 'password', 'tenant-123');

      // Assert
      expect(userService.findByEmail).toHaveBeenCalledWith('nonexistent@example.com', 'tenant-123');
      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      // Arrange
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(userService, 'validatePassword').mockResolvedValue(false);

      // Act
      const result = await service.validateUser('test@example.com', 'wrongpassword', 'tenant-123');

      // Assert
      expect(userService.findByEmail).toHaveBeenCalledWith('test@example.com', 'tenant-123');
      expect(userService.validatePassword).toHaveBeenCalledWith('wrongpassword', 'hashedPassword');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should generate tokens when credentials are valid and MFA is not enabled', async () => {
      // Act
      const result = await service.login(mockUserResult);

      // Assert
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: '123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        roles: ['user'],
      });
      expect(refreshTokenService.generateRefreshToken).toHaveBeenCalledWith(mockUserResult);
      expect(result).toEqual({
        accessToken: 'mocked.jwt.token',
        refreshToken: 'mocked-refresh-token',
        user: {
          id: '123',
          email: 'test@example.com',
          tenantId: 'tenant-123',
          mfaEnabled: false,
        },
      });
    });

    it('should return requiresMfa flag when MFA is enabled but no code provided', async () => {
      // Arrange
      const userWithMfa = {
        ...mockUserResult,
        mfaEnabled: true,
      } as unknown as User;

      // Act
      const result = await service.login(userWithMfa);

      // Assert
      expect(result).toEqual({ requiresMfa: true });
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(refreshTokenService.generateRefreshToken).not.toHaveBeenCalled();
    });

    it('should generate tokens when MFA is enabled and valid code is provided', async () => {
      // Arrange
      const userWithMfa = {
        ...mockUserResult,
        mfaEnabled: true,
      } as unknown as User;
      jest.spyOn(mfaService, 'verifyToken').mockResolvedValue(true);

      // Act
      const result = await service.login(userWithMfa, '123456');

      // Assert
      expect(mfaService.verifyToken).toHaveBeenCalledWith('123', '123456');
      expect(jwtService.sign).toHaveBeenCalled();
      expect(refreshTokenService.generateRefreshToken).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException when MFA code is invalid', async () => {
      // Arrange
      const userWithMfa = {
        ...mockUserResult,
        mfaEnabled: true,
      } as unknown as User;
      jest.spyOn(mfaService, 'verifyToken').mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(userWithMfa, '654321'))
        .rejects.toThrow(UnauthorizedException);
      expect(mfaService.verifyToken).toHaveBeenCalledWith('123', '654321');
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token with the provided payload', () => {
      // Arrange
      const payload = {
        sub: '123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        roles: ['user'],
      };

      // Act
      const token = service.generateToken(payload);

      // Assert
      expect(jwtService.sign).toHaveBeenCalledWith(payload);
      expect(token).toEqual('mocked.jwt.token');
    });
  });
}); 