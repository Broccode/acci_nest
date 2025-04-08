import { EntityManager } from '@mikro-orm/core';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
// Verwende require für Passport-LDAP, da es Probleme mit den TypeScript-Typen gibt
const LdapStrategy = require('passport-ldapauth').Strategy;
import { Tenant, TenantStatus } from '../../tenants/entities/tenant.entity';
import { User, UserStatus } from '../../users/entities/user.entity';
import { LdapServerConfig, LdapUserProfile } from '../types/ldap.types';

/**
 * LDAP/Active Directory authentication strategy
 *
 * @description Passport strategy for LDAP/AD authentication
 */
@Injectable()
export class LdapAuthStrategy extends PassportStrategy(LdapStrategy, 'ldap') {
  constructor(private readonly configService: ConfigService, private readonly em: EntityManager) {
    const ldapConfig: LdapServerConfig = {
      url: configService.get<string>('ldap.url') || '',
      bindDN: configService.get<string>('ldap.bindDN') || '',
      bindCredentials: configService.get<string>('ldap.bindCredentials') || '',
      searchBase: configService.get<string>('ldap.searchBase') || '',
      searchFilter: configService.get<string>('ldap.searchFilter') || '',
      searchAttributes: ['displayName', 'mail', 'givenName', 'sn', 'sAMAccountName', 'memberOf'],
      tlsOptions: {
        rejectUnauthorized: configService.get<boolean>('ldap.tlsOptions.rejectUnauthorized', true),
      },
      starttls: configService.get<boolean>('ldap.useTLS'),
    };

    super({
      server: ldapConfig,
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  /**
   * Validate LDAP user and find or create local user
   *
   * @param ldapUser User data from LDAP/AD
   * @returns Local user
   * @throws UnauthorizedException if LDAP authentication fails
   */
  async validate(ldapUser: LdapUserProfile): Promise<User> {
    console.log(
      'LdapAuthStrategy.validate called with ldapUser:',
      JSON.stringify(ldapUser, null, 2)
    );
    try {
      let email = ldapUser.mail || '';
      const firstName = ldapUser.givenName || ldapUser.displayName || '';
      const lastName = ldapUser.sn || '';
      const username = ldapUser.sAMAccountName || '';

      console.log(
        `Extracted from LDAP Profile - Email: ${email}, Username: ${username}, First: ${firstName}, Last: ${lastName}`
      );

      if (!email && username) {
        const defaultDomain = this.configService.get<string>(
          'ldap.defaultTenantDomain',
          'ldap.domain'
        );
        email = `${username}@${defaultDomain}`;
        console.log(`Constructed email: ${email}`);
      }

      if (!email) {
        console.error('LDAP Validate Error: Email could not be determined from LDAP profile.');
        throw new UnauthorizedException(
          'Email nicht vom LDAP-Server bereitgestellt oder ableitbar.'
        );
      }

      const tenantId = this.configService.get<string>('ldap.defaultTenantId');
      console.log(`Using Tenant ID: ${tenantId}`);

      let tenant = await this.em.findOne(Tenant, { id: tenantId });
      console.log(`Tenant found: ${!!tenant}`);

      if (!tenant) {
        console.log('Tenant not found, creating default tenant...');
        tenant = await this.createDefaultTenant();
        console.log(`Default tenant created with ID: ${tenant.id}`);
      } else {
        console.log(`Using existing tenant: ${tenant.id} (${tenant.name})`);
      }

      console.log(`Searching for user with email: ${email.toLowerCase()}, tenantId: ${tenant.id}`);
      let user = await this.em.findOne(User, { email: email.toLowerCase(), tenantId: tenant.id });
      console.log(`User found in DB: ${!!user}`);

      if (!user) {
        console.log(`User not found, creating new user for email: ${email}`);
        user = this.em.create(User, {
          email: email.toLowerCase(),
          password:
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15),
          profile: {
            firstName,
            lastName,
          },
          tenantId: tenant.id,
          tenant,
          status: UserStatus.ACTIVE,
        });
        console.log('Persisting new user...');
        await this.em.persistAndFlush(user);
        console.log(`New user persisted with ID: ${user.id}`);
      } else {
        console.log(`Using existing user: ${user.id}`);
        if (user.profile.firstName !== firstName || user.profile.lastName !== lastName) {
          console.log(`Updating profile for user: ${user.id}`);
          user.profile.firstName = firstName;
          user.profile.lastName = lastName;
          await this.em.flush();
          console.log(`Profile updated for user: ${user.id}`);
        }
      }

      console.log(`LdapAuthStrategy.validate returning user: ${user.id} (${user.email})`);
      return user;
    } catch (error: unknown) {
      let errorMessage = 'LDAP-Authentifizierung intern fehlgeschlagen';
      if (error instanceof Error) {
        console.error('LDAP authentication error in validate method:', error.message, error.stack);
        errorMessage = `${errorMessage}: ${error.message}`;
      } else {
        console.error('LDAP authentication error in validate method (non-Error type):', error);
      }

      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(errorMessage);
    }
  }

  /**
   * Create default tenant for LDAP users if needed
   *
   * @returns Newly created tenant
   */
  private async createDefaultTenant(): Promise<Tenant> {
    const defaultTenantName = this.configService.get<string>('ldap.defaultTenantName', 'ldap');
    const defaultTenantDomain = this.configService.get<string>(
      'ldap.defaultTenantDomain',
      'ldap.domain'
    );

    const tenant = this.em.create(Tenant, {
      name: defaultTenantName,
      domain: defaultTenantDomain,
      status: TenantStatus.ACTIVE,
    });

    await this.em.persistAndFlush(tenant);
    return tenant;
  }
}
