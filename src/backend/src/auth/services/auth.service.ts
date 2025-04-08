import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../users/entities/user.entity';
import { UserService } from '../../users/services/user.service';
import { AuthResponse, JwtPayload } from '../types/auth.types';
import { MfaService } from './mfa.service';
import { RefreshTokenService } from './refresh-token.service';

/**
 * Authentication Service
 *
 * @description Handles user authentication and token management
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService?: RefreshTokenService,
    private readonly mfaService?: MfaService
  ) {}

  /**
   * Validate user credentials
   *
   * @param email User email
   * @param password User password
   * @param tenantId Tenant ID
   * @returns Validated user or null
   */
  async validateUser(
    email: string,
    password: string,
    tenantId: string
  ): Promise<Partial<User> | null> {
    const user = await this.userService.findByEmail(email, tenantId);
    if (user && (await this.userService.validatePassword(password, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * Login user and generate tokens
   *
   * @param user User object
   * @param mfaCode MFA code if MFA is enabled
   * @returns Auth tokens
   */
  async login(
    user: Partial<User> & {
      id: string;
      roles?: string[] | { getItems: () => Array<{ name: string }> };
    },
    mfaCode?: string
  ): Promise<AuthResponse> {
    // Check if MFA is required
    if (user.mfaEnabled && this.mfaService) {
      // If MFA is enabled but no code provided, return requiresMfa flag
      if (!mfaCode) {
        return { requiresMfa: true };
      }

      // Verify MFA code
      const isValidMfa = await this.mfaService.verifyToken(user.id, mfaCode);
      if (!isValidMfa) {
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    // Generate JWT payload
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email || '',
      tenantId: user.tenantId || '',
      roles: user.roles?.getItems?.()
        ? user.roles.getItems().map((role) => role.name)
        : (user.roles as string[]) || [],
    };

    // Generate access token
    const accessToken = this.generateToken(payload);

    // Generate refresh token if service is available
    let refreshToken;
    if (this.refreshTokenService && user.id) {
      refreshToken = await this.refreshTokenService.generateRefreshToken(user as User);
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        mfaEnabled: user.mfaEnabled,
      },
    };
  }

  /**
   * Generate a JWT access token
   *
   * @param payload Token payload
   * @returns Signed JWT token
   */
  generateToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }
}
