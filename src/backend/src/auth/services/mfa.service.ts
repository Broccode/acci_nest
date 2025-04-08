import * as crypto from 'crypto';
import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as OTPAuth from 'otpauth';
import * as qrcode from 'qrcode';
import { User } from '../../users/entities/user.entity';
import { MfaSetupResponse } from '../types/auth.types';

/**
 * Multi-Factor Authentication Service
 *
 * @description Manages MFA setup, verification, and disabling
 */
@Injectable()
export class MfaService {
  constructor(private readonly configService: ConfigService, private readonly em: EntityManager) {}

  /**
   * Set up MFA for a user
   *
   * @param userId User ID
   * @param tenantId Tenant ID
   * @returns MFA setup data including secret and QR code
   */
  async setupMfa(userId: string, tenantId: string): Promise<MfaSetupResponse> {
    // Find the user
    const user = await this.em.findOneOrFail(User, { id: userId, tenantId });

    // Generate a random secret
    const secret = this.generateSecret();

    // Create a TOTP object
    const totp = new OTPAuth.TOTP({
      issuer: this.configService.get('app.name', 'ACCI Nest'),
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    // Generate a QR code URL
    const otpAuthUrl = totp.toString();
    const qrCodeUrl = await qrcode.toDataURL(otpAuthUrl);

    // Store the secret temporarily (not enabling MFA yet)
    // Actual MFA enablement happens after verification
    user.mfaSecret = this.encryptSecret(secret);
    await this.em.flush();

    return {
      secret,
      qrCodeUrl,
    };
  }

  /**
   * Verify a TOTP token against the user's secret
   *
   * @param userId User ID
   * @param token TOTP token
   * @returns Boolean indicating if the token is valid
   */
  async verifyToken(userId: string, token: string): Promise<boolean> {
    // Find the user
    const user = await this.em.findOneOrFail(User, { id: userId });

    if (!user.mfaSecret) {
      return false;
    }

    // Decrypt the secret
    const secret = this.decryptSecret(user.mfaSecret);

    // Create a TOTP object
    const totp = new OTPAuth.TOTP({
      issuer: this.configService.get('app.name', 'ACCI Nest'),
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    // Verify the token
    const delta = totp.validate({ token });

    // If token is valid, enable MFA on first verification
    if (delta !== null && !user.mfaEnabled) {
      user.mfaEnabled = true;
      await this.em.flush();
    }

    return delta !== null;
  }

  /**
   * Disable MFA for a user
   *
   * @param userId User ID
   * @param tenantId Tenant ID
   */
  async disableMfa(userId: string, tenantId: string): Promise<void> {
    // Find the user
    const user = await this.em.findOneOrFail(User, { id: userId, tenantId });

    // Disable MFA
    user.mfaEnabled = false;
    user.mfaSecret = null;
    await this.em.flush();
  }

  /**
   * Generate a random secret
   *
   * @returns Random secret for TOTP
   */
  private generateSecret(): string {
    // Generate random bytes and convert to base32-like format
    // 'base32' is not a valid BufferEncoding, so we use our own implementation
    const bytes = crypto.randomBytes(20);
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';

    // Process 5 bits at a time to convert to base32
    let bits = 0;
    let value = 0;

    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8) | bytes[i];
      bits += 8;

      while (bits >= 5) {
        bits -= 5;
        result += base32Chars[(value >>> bits) & 31];
      }
    }

    // Add remaining bits if any
    if (bits > 0) {
      result += base32Chars[(value << (5 - bits)) & 31];
    }

    return result;
  }

  /**
   * Encrypt a secret
   *
   * @param secret Secret to encrypt
   * @returns Encrypted secret
   */
  private encryptSecret(secret: string): string {
    const algorithm = 'aes-256-cbc';
    const encryptionKey = this.configService.get('jwt.secret');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(
      algorithm,
      crypto.createHash('sha256').update(encryptionKey).digest('base64').substring(0, 32),
      iv
    );

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt a secret
   *
   * @param encryptedSecret Encrypted secret
   * @returns Decrypted secret
   */
  private decryptSecret(encryptedSecret: string): string {
    const algorithm = 'aes-256-cbc';
    const encryptionKey = this.configService.get('jwt.secret');

    const [ivHex, encrypted] = encryptedSecret.split(':');
    const iv = Buffer.from(ivHex, 'hex');

    const decipher = crypto.createDecipheriv(
      algorithm,
      crypto.createHash('sha256').update(encryptionKey).digest('base64').substring(0, 32),
      iv
    );

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
