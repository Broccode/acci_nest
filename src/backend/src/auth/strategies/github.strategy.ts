import { EntityManager } from '@mikro-orm/core';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-github2';
import { Tenant, TenantStatus } from '../../tenants/entities/tenant.entity';
import { User, UserStatus } from '../../users/entities/user.entity';

/**
 * GitHub OAuth2 strategy
 * 
 * @description Passport strategy for GitHub authentication
 */
@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private readonly configService: ConfigService,
    private readonly em: EntityManager,
  ) {
    super({
      clientID: configService.get('oauth.github.clientId'),
      clientSecret: configService.get('oauth.github.clientSecret'),
      callbackURL: configService.get('oauth.github.callbackUrl'),
      scope: ['user:email'],
    });
  }

  /**
   * Validate GitHub profile and find or create user
   * 
   * @param accessToken GitHub access token
   * @param refreshToken GitHub refresh token
   * @param profile GitHub profile
   * @param done Passport callback
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: User | false) => void,
  ): Promise<void> {
    try {
      // Extract profile information
      const { emails, displayName, username } = profile;
      
      // GitHub may not provide email directly, so we need to handle this case
      if (!emails || emails.length === 0) {
        return done(new UnauthorizedException('Email not provided by GitHub'), null);
      }
      
      const email = emails[0].value;
      
      // Parse name from displayName or use username as fallback
      let firstName = '';
      let lastName = '';
      
      if (displayName) {
        const nameParts = displayName.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      } else {
        firstName = username || '';
      }
      
      // For social logins, we'll use a default tenant for now
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
          // For social logins, we set a random password
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