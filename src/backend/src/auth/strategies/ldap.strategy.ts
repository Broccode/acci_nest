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
  constructor(
    private readonly configService: ConfigService,
    private readonly em: EntityManager,
  ) {
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
    try {
      const email = ldapUser.mail || '';
      const firstName = ldapUser.givenName || ldapUser.displayName || '';
      const lastName = ldapUser.sn || '';
      const username = ldapUser.sAMAccountName || '';
      
      if (!email) {
        throw new UnauthorizedException('Email nicht vom LDAP-Server bereitgestellt');
      }
      
      // Get tenant ID from request context or use a default tenant
      // For LDAP users, we might determine tenant based on LDAP groups or OU
      const tenantId = this.configService.get<string>('ldap.defaultTenantId');
      
      // Find or create the tenant
      let tenant = await this.em.findOne(Tenant, { id: tenantId });
      
      if (!tenant) {
        tenant = await this.createDefaultTenant();
      }
      
      // Find existing user
      let user = await this.em.findOne(User, { email, tenantId: tenant.id });
      
      // Create user if not exists
      if (!user) {
        user = this.em.create(User, {
          email,
          // For LDAP users, we don't store the password locally
          password: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
          profile: {
            firstName,
            lastName,
          },
          tenantId: tenant.id,
          tenant,
          status: UserStatus.ACTIVE,
        });
        
        await this.em.persistAndFlush(user);
      } else {
        // Update user profile if needed
        if (user.profile.firstName !== firstName || user.profile.lastName !== lastName) {
          user.profile.firstName = firstName;
          user.profile.lastName = lastName;
          await this.em.flush();
        }
      }
      
      return user;
    } catch (error) {
      console.error('LDAP authentication error:', error);
      throw new UnauthorizedException('LDAP-Authentifizierung fehlgeschlagen');
    }
  }
  
  /**
   * Create default tenant for LDAP users if needed
   * 
   * @returns Newly created tenant
   */
  private async createDefaultTenant(): Promise<Tenant> {
    const defaultTenantName = this.configService.get<string>('ldap.defaultTenantName', 'ldap');
    const defaultTenantDomain = this.configService.get<string>('ldap.defaultTenantDomain', 'ldap.domain');
    
    const tenant = this.em.create(Tenant, {
      name: defaultTenantName,
      domain: defaultTenantDomain,
      status: TenantStatus.ACTIVE,
    });
    
    await this.em.persistAndFlush(tenant);
    return tenant;
  }
} 