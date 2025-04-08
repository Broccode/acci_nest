import { EntityManager } from '@mikro-orm/core';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { Tenant, TenantStatus } from '../../tenants/entities/tenant.entity';
import { User, UserStatus } from '../../users/entities/user.entity';

/**
 * Google OAuth2 strategy
 *
 * @description Passport strategy for Google authentication
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService, private readonly em: EntityManager) {
    super({
      clientID: configService.get('oauth.google.clientId'),
      clientSecret: configService.get('oauth.google.clientSecret'),
      callbackURL: configService.get('oauth.google.callbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  /**
   * Validate Google profile and find or create user
   *
   * @param accessToken Google access token
   * @param refreshToken Google refresh token
   * @param profile Google profile
   * @param done Passport callback
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: User | false) => void
  ): Promise<void> {
    try {
      // Extract profile information
      const { emails, name } = profile;

      if (!emails || emails.length === 0) {
        return done(new UnauthorizedException('Email not provided by Google'), null);
      }

      const email = emails[0].value;
      const firstName = name?.givenName || '';
      const lastName = name?.familyName || '';

      // For social logins, we'll use a default tenant for now
      // In a real application, you would determine the tenant based on your business logic
      const defaultTenantName = 'default';
      const defaultTenantDomain = 'default.domain';

      // Find or create the default tenant
      let tenant = await this.em.findOne(Tenant, { name: defaultTenantName });
      if (!tenant) {
        tenant = this.em.create(Tenant, {
          name: defaultTenantName,
          domain: defaultTenantDomain,
          status: TenantStatus.ACTIVE,
        });
        await this.em.persistAndFlush(tenant);
      }

      // Find existing user
      let user = await this.em.findOne(User, { email, tenantId: tenant.id });

      // Create user if not exists
      if (!user) {
        user = this.em.create(User, {
          email,
          // For social logins, we set a random password (they'll authenticate via Google)
          password: Math.random().toString(36).substring(2, 15),
          profile: {
            firstName,
            lastName,
          },
          tenantId: tenant.id,
          tenant,
          status: UserStatus.ACTIVE,
        });

        await this.em.persistAndFlush(user);
      }

      // Update user profile if needed
      if (user.profile.firstName !== firstName || user.profile.lastName !== lastName) {
        user.profile.firstName = firstName;
        user.profile.lastName = lastName;
        await this.em.flush();
      }

      return done(null, user);
    } catch (error) {
      return done(error instanceof Error ? error : new Error(String(error)), null);
    }
  }
}
