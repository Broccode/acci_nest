import * as crypto from 'crypto';
import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../users/entities/user.entity';
import { RefreshTokenData } from '../types/auth.types';

/**
 * Refresh Token Service
 * 
 * @description Manages refresh token generation, validation, and revocation
 */
@Injectable()
export class RefreshTokenService {
  private readonly refreshTokens = new Map<string, RefreshTokenData>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly em: EntityManager,
  ) {}

  /**
   * Generate a refresh token for a user
   * 
   * @param user User to generate token for
   * @returns Generated refresh token
   */
  async generateRefreshToken(user: User): Promise<string> {
    // Generate a unique token ID
    const tokenId = crypto.randomBytes(64).toString('hex');
    
    // Calculate expiration time (default: 7 days)
    const expiresInSeconds = this.configService.get('auth.refreshTokenExpiresIn', 7 * 24 * 60 * 60);
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    
    // Get user roles
    const roles = user.roles.getItems().map(role => role.name);
    
    // Store token data
    const tokenData: RefreshTokenData = {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles,
      expiresAt,
    };
    
    this.refreshTokens.set(tokenId, tokenData);
    
    // For a production app, we would store this in Redis or a database
    // with proper expiration handling
    
    return tokenId;
  }

  /**
   * Validate a refresh token
   * 
   * @param token Refresh token to validate
   * @returns Token data if valid, null otherwise
   */
  async validateRefreshToken(token: string): Promise<RefreshTokenData | null> {
    // Get token data
    const tokenData = this.refreshTokens.get(token);
    
    if (!tokenData) {
      return null;
    }
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (tokenData.expiresAt < now) {
      this.refreshTokens.delete(token);
      return null;
    }
    
    return tokenData;
  }

  /**
   * Revoke a refresh token
   * 
   * @param token Refresh token to revoke
   */
  async revokeRefreshToken(token: string): Promise<void> {
    this.refreshTokens.delete(token);
  }

  /**
   * Revoke all refresh tokens for a user
   * 
   * @param userId User ID
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    // Find all tokens for the user and revoke them
    for (const [token, data] of this.refreshTokens.entries()) {
      if (data.userId === userId) {
        this.refreshTokens.delete(token);
      }
    }
  }
} 