import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import configuration from '../../config/configuration'; // Import the default export
import { UserService } from '../../users/services/user.service';
import { JwtPayload } from '../types/auth.types';

// Infer the configuration type from the configuration function
type AppConfig = ReturnType<typeof configuration>;

/**
 * JWT authentication strategy for passport
 *
 * @description Validates JWT tokens and extracts user information
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService<AppConfig>, // Use the inferred type
    private readonly userService: UserService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Use the correct configuration path and ensure type safety
      secretOrKey: configService.get('auth.jwtSecret', { infer: true }),
    });
  }

  /**
   * Validate JWT payload and return user information
   *
   * @param payload JWT payload with user data
   * @returns User information if valid
   * @throws UnauthorizedException if user not found or not authorized
   */
  async validate(payload: JwtPayload) {
    // Find the user by ID and tenant
    const user = await this.userService.findById(payload.sub, payload.tenantId);

    if (!user) {
      throw new UnauthorizedException('User not found or not authorized');
    }

    return {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: payload.roles,
    };
  }
}
