import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-local';
import { User } from '../../users/entities/user.entity';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../types/auth.types';

/**
 * Local authentication strategy for passport
 *
 * @description Validates username/password credentials
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  /**
   * Validate user credentials
   *
   * @param request Express request object containing tenant ID
   * @param email User email
   * @param password User password
   * @returns Authenticated user
   * @throws UnauthorizedException if credentials are invalid
   */
  async validate(request: Request, email: string, password: string): Promise<Partial<User>> {
    // Extract tenant ID from request body
    const tenantId = request.body.tenantId;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID is required');
    }

    const user = await this.authService.validateUser(email, password, tenantId);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}
