import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../controllers/auth.controller';
import { AuthService } from '../../services/auth.service';
import { MfaService } from '../../services/mfa.service';
import { RefreshTokenService } from '../../services/refresh-token.service';
import { UserService } from '../../../users/services/user.service';
import { UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { Collection } from '@mikro-orm/core';
import { Role } from '../../../users/entities/role.entity';
import { LoginDto } from '../../dto/login.dto';
import { LdapLoginDto } from '../../dto/ldap-login.dto';
import { MfaSetupResponse } from '../../interfaces/mfa-setup-response.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let refreshTokenService: RefreshTokenService;
  let mfaService: MfaService;
  let userService: UserService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    tenantId: 'tenant-1',
    mfaEnabled: false,
    roles: new Collection<Role>(null, []),
  };

  const mockAuthResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: {
      id: mockUser.id,
      email: mockUser.email,
      tenantId: mockUser.tenantId,
      mfaEnabled: mockUser.mfaEnabled,
    },
  };

  const mockRefreshTokenData = {
    userId: mockUser.id,
    email: mockUser.email,
    tenantId: mockUser.tenantId,
    roles: ['user'],
    isValid: true,
    token: 'new-refresh-token',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockResolvedValue(mockAuthResponse),
            generateToken: jest.fn().mockReturnValue('mock-access-token'),
          },
        },
        {
          provide: RefreshTokenService,
          useValue: {
            validateRefreshToken: jest.fn().mockResolvedValue(mockRefreshTokenData),
            revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
            rotateRefreshToken: jest.fn().mockResolvedValue({
              isValid: true,
              token: 'new-refresh-token',
            }),
          },
        },
        {
          provide: MfaService,
          useValue: {
            setupMfa: jest.fn().mockResolvedValue({
              secret: 'mfa-secret',
              qrCode: 'qr-code-data-url',
            }),
            verifyToken: jest.fn().mockResolvedValue(true),
            disableMfa: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: UserService,
          useValue: {
            findById: jest.fn().mockResolvedValue(mockUser),
            updateMfaSecret: jest.fn().mockResolvedValue(undefined),
            enableMfa: jest.fn().mockResolvedValue(undefined),
            disableMfa: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    refreshTokenService = module.get<RefreshTokenService>(RefreshTokenService);
    mfaService = module.get<MfaService>(MfaService);
    userService = module.get<UserService>(UserService);
  });

  describe('login', () => {
    it('should authenticate user with valid credentials', async () => {
      const req = { user: mockUser };
      const loginDto: LoginDto = { 
        email: 'test@example.com', 
        password: 'password',
        tenantId: 'tenant-1'
      };

      const result = await controller.login(req as any, loginDto);

      expect(result).toEqual(mockAuthResponse);
      expect(authService.login).toHaveBeenCalledWith(mockUser, undefined);
    });

    it('should handle MFA validation during login', async () => {
      const req = { user: { ...mockUser, mfaEnabled: true } };
      const loginDto: LoginDto = { 
        email: 'test@example.com', 
        password: 'password',
        tenantId: 'tenant-1',
        mfaCode: '123456' 
      };

      await controller.login(req as any, loginDto);

      expect(authService.login).toHaveBeenCalledWith(
        { ...mockUser, mfaEnabled: true },
        '123456'
      );
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      const refreshTokenDto = { refreshToken: 'old-refresh-token' };

      const result = await controller.refresh(refreshTokenDto);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(refreshTokenService.validateRefreshToken).toHaveBeenCalledWith('old-refresh-token');
      expect(userService.findById).toHaveBeenCalledWith(mockUser.id, mockUser.tenantId);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      jest.spyOn(refreshTokenService, 'validateRefreshToken').mockResolvedValue(null);
      const refreshTokenDto = { refreshToken: 'invalid-token' };

      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      jest.spyOn(userService, 'findById').mockResolvedValue(null);
      const refreshTokenDto = { refreshToken: 'old-refresh-token' };

      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
      expect(refreshTokenService.revokeRefreshToken).toHaveBeenCalledWith('old-refresh-token');
    });
  });

  describe('logout', () => {
    it('should logout user and revoke refresh token', async () => {
      const refreshTokenDto = { refreshToken: 'refresh-token' };

      const result = await controller.logout(mockUser, refreshTokenDto);

      expect(result).toEqual({ message: 'Logout successful' });
      expect(refreshTokenService.revokeRefreshToken).toHaveBeenCalledWith('refresh-token');
    });

    it('should handle logout without refresh token', async () => {
      const result = await controller.logout(mockUser, { refreshToken: '' });

      expect(result).toEqual({ message: 'Logout successful' });
      expect(refreshTokenService.revokeRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return user profile', () => {
      const result = controller.getProfile(mockUser);
      expect(result).toEqual(mockUser);
    });
  });

  describe('OAuth flows', () => {
    const mockResponse = {
      redirect: jest.fn(),
    } as unknown as Response;

    it('should handle Google OAuth callback', async () => {
      const req = { user: mockUser };
      
      await controller.googleAuthCallback(req as any, mockResponse);

      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        `/auth/login-success?token=${mockAuthResponse.accessToken}`
      );
    });

    it('should handle GitHub OAuth callback', async () => {
      const req = { user: mockUser };
      
      await controller.githubAuthCallback(req as any, mockResponse);

      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        `/auth/login-success?token=${mockAuthResponse.accessToken}`
      );
    });
  });

  describe('MFA operations', () => {
    it('should setup MFA for user', async () => {
      const mockMfaResponse: MfaSetupResponse = {
        secret: 'mfa-secret',
        qrCodeUrl: 'qr-code-data-url',
      };
      jest.spyOn(mfaService, 'setupMfa').mockResolvedValue(mockMfaResponse);

      const result = await controller.setupMfa(mockUser);

      expect(result).toEqual(mockMfaResponse);
      expect(mfaService.setupMfa).toHaveBeenCalledWith(mockUser.id, mockUser.tenantId);
    });

    it('should verify MFA token', async () => {
      const mfaDto = { mfaCode: '123456' };
      jest.spyOn(mfaService, 'verifyToken').mockResolvedValue(true);

      const result = await controller.verifyMfa(mockUser, mfaDto);

      expect(result).toEqual({
        success: true,
        message: 'MFA setup completed successfully',
      });
      expect(mfaService.verifyToken).toHaveBeenCalledWith(mockUser.id, '123456');
    });

    it('should disable MFA', async () => {
      const mfaDto = { mfaCode: '123456' };
      jest.spyOn(mfaService, 'verifyToken').mockResolvedValue(true);

      const result = await controller.disableMfa(mockUser, mfaDto);

      expect(result).toEqual({
        success: true,
        message: 'MFA disabled successfully',
      });
      expect(mfaService.verifyToken).toHaveBeenCalledWith(mockUser.id, '123456');
      expect(mfaService.disableMfa).toHaveBeenCalledWith(mockUser.id, mockUser.tenantId);
    });
  });

  describe('LDAP authentication', () => {
    it('should authenticate LDAP user', async () => {
      const req = { user: mockUser };

      const result = await controller.ldapLogin(req as any);

      expect(result).toEqual(mockAuthResponse);
      expect(authService.login).toHaveBeenCalledWith(mockUser);
    });
  });
}); 