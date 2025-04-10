import { Collection } from '@mikro-orm/core';
import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request as ExpressRequest, Response } from 'express';
import { Role } from '../../users/entities/role.entity';
import { User } from '../../users/entities/user.entity';
import { UserService } from '../../users/services/user.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService } from '../services/auth.service';
import { MfaService } from '../services/mfa.service';
import { RefreshTokenService } from '../services/refresh-token.service';
import {
  JwtPayload,
  LdapLoginDto,
  LoginDto,
  MfaDto,
  MfaSetupDto,
  RefreshTokenDto,
} from '../types/auth.types';

// Type for authenticated user
type AuthenticatedUser = Partial<User> & { id: string };

/**
 * Authentication Controller
 *
 * @description Handles authentication-related endpoints
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly mfaService: MfaService,
    private readonly userService: UserService
  ) {}

  /**
   * User login endpoint
   *
   * @param req Request object
   * @param loginDto Login data
   * @returns Authentication response with tokens
   */
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    schema: {
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            tenantId: { type: 'string' },
            mfaEnabled: { type: 'boolean' },
          },
        },
        requiresMfa: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('login')
  @UseGuards(AuthGuard('local'))
  async login(
    @Request() req: ExpressRequest & { user: AuthenticatedUser },
    @Body() loginDto: LoginDto
  ) {
    return this.authService.login(req.user, loginDto.mfaCode);
  }

  /**
   * Refresh access token using refresh token
   *
   * @param refreshTokenDto Refresh token data
   * @returns New access token and refresh token
   */
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 201,
    description: 'Tokens refreshed successfully',
    schema: {
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @Post('refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    // Validate the old token first
    const oldTokenData = await this.refreshTokenService.validateRefreshToken(
      refreshTokenDto.refreshToken
    );

    if (!oldTokenData) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Fetch the user associated with the token
    const user = await this.userService.findById(oldTokenData.userId, oldTokenData.tenantId);
    if (!user) {
      // If user not found, revoke token and throw error
      await this.refreshTokenService.revokeRefreshToken(refreshTokenDto.refreshToken);
      throw new UnauthorizedException('User not found for refresh token');
    }

    // Rotate the token (invalidate old, get new)
    const rotationResult = await this.refreshTokenService.rotateRefreshToken(
      refreshTokenDto.refreshToken,
      user
    );

    if (!rotationResult.isValid) {
      // Should ideally not happen if validation passed, but handle defensively
      throw new UnauthorizedException('Failed to rotate refresh token');
    }

    // Generate the payload for the new access token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      // Ensure roles are correctly extracted
      roles: user.roles?.isInitialized()
        ? user.roles.getItems().map((role) => role.name)
        : oldTokenData.roles || [],
    };
    const newAccessToken = this.authService.generateToken(payload);

    return {
      accessToken: newAccessToken,
      refreshToken: rotationResult.token, // Return the new refresh token from rotation
    };
  }

  /**
   * Logout user and invalidate refresh token
   *
   * @param user Current user
   * @param refreshTokenDto Refresh token to invalidate
   * @returns Success message
   */
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @Post('logout')
  async logout(@CurrentUser() user: AuthenticatedUser, @Body() refreshTokenDto: RefreshTokenDto) {
    if (refreshTokenDto.refreshToken) {
      // Optional: Validate refresh token belongs to the user trying to log out if user context is available
      await this.refreshTokenService.revokeRefreshToken(refreshTokenDto.refreshToken);
    }
    return { message: 'Logout successful' };
  }

  /**
   * Get current user profile
   *
   * @param user Current authenticated user
   * @returns User profile
   */
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  /**
   * Initiate Google OAuth2 authentication
   */
  @ApiOperation({ summary: 'Login with Google' })
  @ApiResponse({ status: 302, description: 'Redirect to Google auth' })
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // The guard redirects to Google login
    // This function won't be called
  }

  /**
   * Handle Google OAuth2 callback
   *
   * @param req Request object
   * @param res Response object
   */
  @ApiOperation({ summary: 'Google auth callback' })
  @ApiResponse({ status: 302, description: 'Redirect after authentication' })
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(
    @Request() req: ExpressRequest & { user: AuthenticatedUser },
    @Res() res: Response
  ) {
    const auth = await this.authService.login(req.user);

    // In a real application, you would redirect to a frontend URL
    // with the tokens in query parameters or as cookies
    res.redirect(`/auth/login-success?token=${auth.accessToken}`);
  }

  /**
   * Initiate GitHub OAuth2 authentication
   */
  @ApiOperation({ summary: 'Login with GitHub' })
  @ApiResponse({ status: 302, description: 'Redirect to GitHub auth' })
  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubAuth() {
    // The guard redirects to GitHub login
    // This function won't be called
  }

  /**
   * Handle GitHub OAuth2 callback
   *
   * @param req Request object
   * @param res Response object
   */
  @ApiOperation({ summary: 'GitHub auth callback' })
  @ApiResponse({ status: 302, description: 'Redirect after authentication' })
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthCallback(
    @Request() req: ExpressRequest & { user: AuthenticatedUser },
    @Res() res: Response
  ) {
    const auth = await this.authService.login(req.user);

    // In a real application, you would redirect to a frontend URL
    // with the tokens in query parameters or as cookies
    res.redirect(`/auth/login-success?token=${auth.accessToken}`);
  }

  /**
   * Login success page (placeholder)
   *
   * @param req Request object
   * @returns Success message with token
   */
  @ApiOperation({ summary: 'Login success page' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @Get('login-success')
  loginSuccess(@Request() req: ExpressRequest) {
    return {
      message: 'Login successful',
      token: req.query.token,
    };
  }

  /**
   * Setup MFA for a user
   *
   * @param user Current authenticated user
   * @returns MFA setup data
   */
  @ApiOperation({ summary: 'Setup MFA' })
  @ApiResponse({
    status: 200,
    description: 'MFA setup data',
    schema: {
      properties: {
        secret: { type: 'string' },
        qrCodeUrl: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  async setupMfa(@CurrentUser() user) {
    return this.mfaService.setupMfa(user.id, user.tenantId);
  }

  /**
   * Verify MFA token
   *
   * @param user Current authenticated user
   * @param mfaDto MFA token
   * @returns Success status
   */
  @ApiOperation({ summary: 'Verify MFA token' })
  @ApiResponse({ status: 200, description: 'MFA verified successfully' })
  @ApiResponse({ status: 401, description: 'Invalid MFA token' })
  @ApiBearerAuth()
  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  async verifyMfa(@CurrentUser() user, @Body() mfaDto: MfaDto) {
    const isValid = await this.mfaService.verifyToken(user.id, mfaDto.mfaCode);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    // MFA wird automatisch durch verifyToken aktiviert, wenn der Token gültig ist
    // userService.updateMfaSecret wird nicht mehr benötigt
    return { success: true, message: 'MFA setup completed successfully' };
  }

  /**
   * Disable MFA for a user
   *
   * @param user Current authenticated user
   * @param mfaDto MFA token for verification
   * @returns Success status
   */
  @ApiOperation({ summary: 'Disable MFA' })
  @ApiResponse({ status: 200, description: 'MFA disabled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid MFA token' })
  @ApiBearerAuth()
  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  async disableMfa(@CurrentUser() user, @Body() mfaDto: MfaDto) {
    const isValid = await this.mfaService.verifyToken(user.id, mfaDto.mfaCode);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    await this.mfaService.disableMfa(user.id, user.tenantId);
    return { success: true, message: 'MFA disabled successfully' };
  }

  /**
   * LDAP/AD User login endpoint
   *
   * @param req Request object
   * @returns Authentication response with tokens
   */
  @ApiOperation({ summary: 'LDAP/AD login' })
  @ApiResponse({
    status: 200,
    description: 'LDAP Authentication successful',
    schema: {
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            tenantId: { type: 'string' },
            mfaEnabled: { type: 'boolean' },
          },
        },
        requiresMfa: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'LDAP Authentication failed' })
  @Post('ldap/login')
  @UseGuards(AuthGuard('ldap'))
  async ldapLogin(@Request() req: ExpressRequest & { user: AuthenticatedUser }) {
    return this.authService.login(req.user);
  }
}
