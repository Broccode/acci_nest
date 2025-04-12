import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { type Mocked, TestBed } from '@suites/unit';
import { AuthService } from './auth.service';
import { UserService } from '../../users/services/user.service';
import { RefreshTokenService } from './refresh-token.service';
import { MfaService } from './mfa.service';
import { User } from '../../users/entities/user.entity';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let unitRef: any;

  let userServiceMock: Mocked<UserService>;
  let jwtServiceMock: Mocked<JwtService>;
  let refreshTokenServiceMock: Mocked<RefreshTokenService>;
  let mfaServiceMock: Mocked<MfaService>;

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

  const mockUserResult = {
    id: '123',
    email: 'test@example.com',
    tenantId: 'tenant-123',
    mfaEnabled: false,
    roles: {
      getItems: jest.fn().mockReturnValue([{ name: 'user' }]),
    },
  } as unknown as User;

  beforeAll(async () => {
    const { unit, unitRef: ref } = await TestBed.solitary(AuthService)
      .compile();
    service = unit;
    unitRef = ref;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    beforeEach(() => {
      userServiceMock = unitRef.get(UserService);
    });

    it('should return user without password when credentials are valid', async () => {
      userServiceMock.findByEmail.mockResolvedValue(mockUser);
      userServiceMock.validatePassword.mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password', 'tenant-123');

      expect(userServiceMock.findByEmail).toHaveBeenCalledWith('test@example.com', 'tenant-123');
      expect(userServiceMock.validatePassword).toHaveBeenCalledWith('password', 'hashedPassword');
      expect(result).toEqual(expect.objectContaining({
        id: '123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
      }));
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user is not found', async () => {
      userServiceMock.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password', 'tenant-123');

      expect(userServiceMock.findByEmail).toHaveBeenCalledWith('nonexistent@example.com', 'tenant-123');
      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      userServiceMock.findByEmail.mockResolvedValue(mockUser);
      userServiceMock.validatePassword.mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword', 'tenant-123');

      expect(userServiceMock.findByEmail).toHaveBeenCalledWith('test@example.com', 'tenant-123');
      expect(userServiceMock.validatePassword).toHaveBeenCalledWith('wrongpassword', 'hashedPassword');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    beforeEach(() => {
      jwtServiceMock = unitRef.get(JwtService);
      refreshTokenServiceMock = unitRef.get(RefreshTokenService);
      mfaServiceMock = unitRef.get(MfaService);
    });

    it('should generate tokens when credentials are valid and MFA is not enabled', async () => {
      jwtServiceMock.sign.mockReturnValue('mocked.jwt.token');
      refreshTokenServiceMock.generateRefreshToken.mockResolvedValue('mocked-refresh-token');

      const result = await service.login(mockUserResult);

      expect(jwtServiceMock.sign).toHaveBeenCalledWith({
        sub: '123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        roles: ['user'],
      });
      expect(refreshTokenServiceMock.generateRefreshToken).toHaveBeenCalledWith(mockUserResult);
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
      const userWithMfa = {
        ...mockUserResult,
        mfaEnabled: true,
      } as unknown as User;

      const result = await service.login(userWithMfa);

      expect(result).toEqual({ requiresMfa: true });
      expect(jwtServiceMock.sign).not.toHaveBeenCalled();
      expect(refreshTokenServiceMock.generateRefreshToken).not.toHaveBeenCalled();
    });

    it('should generate tokens when MFA is enabled and valid code is provided', async () => {
      const userWithMfa = {
        ...mockUserResult,
        mfaEnabled: true,
      } as unknown as User;
      mfaServiceMock.verifyToken.mockResolvedValue(true);

      const result = await service.login(userWithMfa, '123456');

      expect(mfaServiceMock.verifyToken).toHaveBeenCalledWith('123', '123456');
      expect(jwtServiceMock.sign).toHaveBeenCalled();
      expect(refreshTokenServiceMock.generateRefreshToken).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException when MFA code is invalid', async () => {
      const userWithMfa = {
        ...mockUserResult,
        mfaEnabled: true,
      } as unknown as User;
      mfaServiceMock.verifyToken.mockResolvedValue(false);

      await expect(service.login(userWithMfa, '654321'))
        .rejects.toThrow(UnauthorizedException);
      expect(mfaServiceMock.verifyToken).toHaveBeenCalledWith('123', '654321');
    });
  });

  describe('generateToken', () => {
    beforeEach(() => {
      jwtServiceMock = unitRef.get(JwtService);
    });

    it('should generate a JWT token with the provided payload', () => {
      jwtServiceMock.sign.mockReturnValue('mocked.jwt.token');
      const payload = {
        sub: '123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        roles: ['user'],
      };

      const token = service.generateToken(payload);

      expect(jwtServiceMock.sign).toHaveBeenCalledWith(payload);
      expect(token).toEqual('mocked.jwt.token');
    });
  });
}); 