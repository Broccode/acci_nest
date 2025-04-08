# Epic-2 - Story-10

Authentication System Implementation

**As a** developer
**I want to** implement a comprehensive authentication system
**so that** users can securely log in to the application and manage their sessions.

## Status

In Progress

## Context

- We have already implemented the basic user and role models (User, Role, Permission).
- We also have tenant isolation for multi-tenancy.
- The base infrastructure (Redis, MikroORM, etc.) is set up.
- However, we still lack the complete authentication system necessary for secure user login and management.
- This story implements the authentication requirements defined in the PRD, including JWT tokens, OAuth2, and MFA.

## Acceptance Criteria

1. **JWT-based Authentication**
   - Implementation of JWT token generation and validation
   - Secure token storage and management
   - Configurable token expiration time

2. **Local Authentication**
   - Implementation of Passport.js with Local Strategy
   - Secure password validation
   - Login/logout endpoints

3. **OAuth2/OpenID Connect**
   - Integration with external identity providers (Google, GitHub)
   - Implementation of OAuth2/OpenID Connect flows
   - User profile synchronization from external providers

4. **LDAP/Active Directory Integration**
   - Implementation of LDAP authentication strategy
   - Support for Active Directory authentication
   - User synchronization from LDAP/AD directories

5. **Refresh Token Mechanism**
   - Implementation of refresh tokens for enhanced security
   - Token rotation and invalidation
   - Secure token storage

6. **Multi-Factor Authentication (MFA)**
   - Implementation of TOTP (Time-based One-Time Password)
   - QR code generation for authenticator app integration
   - MFA activation/deactivation

7. **Guards and Decorators**
   - Implementation of authentication guards
   - Tenant-aware authentication
   - Custom decorators for access control

8. **Test Coverage**
   - Unit tests for authentication logic
   - Integration tests with simulated authentication flows
   - E2E tests for critical authentication paths

## Estimation

Story Points: 8

## Tasks

1. - [x] JWT Authentication
   1. - [x] Set up JWT module and service
   2. - [x] Implement token generation
   3. - [x] Implement token validation
   4. - [x] Write unit tests for JWT service

2. - [x] Local Authentication with Passport.js
   1. - [x] Create auth module and controller
   2. - [x] Set up Local Strategy for Passport.js
   3. - [x] Implement login/logout endpoints
   4. - [x] Write tests for local authentication

3. - [x] OAuth2/OpenID Connect
   1. - [x] Install necessary dependencies
   2. - [x] Implement Google OAuth2 strategy
   3. - [x] Implement GitHub OAuth2 strategy
   4. - [x] Implement callback handlers and profile synchronization
   5. - [x] Write tests for OAuth2 authentication

4. - [x] LDAP/Active Directory Integration
   1. - [x] Install necessary dependencies (passport-ldapauth)
   2. - [x] Implement LDAP/AD strategy
   3. - [x] Configure LDAP connection and authentication options
   4. - [x] Implement user synchronization from LDAP/AD
   5. - [x] Write tests for LDAP/AD authentication

5. - [x] Refresh Token Mechanism
   1. - [x] Implement refresh token generation
   2. - [x] Create refresh endpoint for token renewal
   3. - [x] Implement token rotation and blacklisting
   4. - [x] Write tests for refresh token mechanism

6. - [x] Multi-Factor Authentication
   1. - [x] Integrate TOTP library
   2. - [x] Implement MFA activation process
   3. - [x] Set up QR code generation
   4. - [x] Implement MFA validation during login
   5. - [x] Write tests for MFA flow

7. - [x] Guards and Decorators
   1. - [x] Implement JwtAuthGuard
   2. - [x] Implement TenantAuthGuard
   3. - [x] Create CurrentUser decorator
   4. - [x] Write tests for guards and decorators

8. - [x] Documentation
   1. - [x] Create API documentation with Swagger
   2. - [x] Write authentication flow documentation
   3. - [x] Update user manual for authentication

9. - [x] Integration Tests
   1. - [x] Create test containers for integration testing
   2. - [x] Implement LDAP authentication integration tests with Samba
   3. - [x] Implement OAuth2 authentication integration tests
   4. - [x] Implement refresh token mechanism integration tests
   5. - [x] Implement MFA integration tests

## Implementation Details

### Authentication Module

```typescript
// src/backend/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { LdapStrategy } from './strategies/ldap.strategy';
import { AuthController } from './controllers/auth.controller';
import { RefreshTokenService } from './services/refresh-token.service';
import { MfaService } from './services/mfa.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('auth.jwtSecret'),
        signOptions: {
          expiresIn: configService.get('auth.jwtExpiresIn', '15m'),
        },
      }),
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RefreshTokenService,
    MfaService,
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
    GithubStrategy,
    LdapStrategy,
  ],
  exports: [AuthService, MfaService, JwtModule],
})
export class AuthModule {}
```

### LDAP Strategy

```typescript
// src/backend/src/auth/strategies/ldap.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-ldapauth';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/core';
import { User, UserStatus } from '../../users/entities/user.entity';
import { Tenant, TenantStatus } from '../../tenants/entities/tenant.entity';

/**
 * LDAP/Active Directory authentication strategy
 * 
 * @description Passport strategy for LDAP/AD authentication
 */
@Injectable()
export class LdapStrategy extends PassportStrategy(Strategy, 'ldap') {
  constructor(
    private readonly configService: ConfigService,
    private readonly em: EntityManager,
  ) {
    super({
      server: {
        url: configService.get('ldap.url'),
        bindDN: configService.get('ldap.bindDN'),
        bindCredentials: configService.get('ldap.bindCredentials'),
        searchBase: configService.get('ldap.searchBase'),
        searchFilter: configService.get('ldap.searchFilter'),
        searchAttributes: ['displayName', 'mail', 'sAMAccountName'],
      },
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  /**
   * Validate LDAP user and find or create local user
   * 
   * @param ldapUser User data from LDAP/AD
   * @returns Local user
   */
  async validate(ldapUser: Record<string, any>): Promise<User> {
    try {
      // Extract user information from LDAP response
      const email = ldapUser.mail || '';
      const firstName = ldapUser.givenName || '';
      const lastName = ldapUser.sn || '';
      const username = ldapUser.sAMAccountName || '';
      
      if (!email) {
        throw new UnauthorizedException('Email not provided by LDAP server');
      }
      
      // Get tenant ID from request context or use a default tenant
      // For LDAP users, we might determine tenant based on LDAP groups or OU
      const tenantId = this.configService.get('ldap.defaultTenantId');
      
      // Find or create the tenant
      const tenant = await this.em.findOne(Tenant, { id: tenantId }) || 
        await this.createDefaultTenant();
      
      // Find existing user
      let user = await this.em.findOne(User, { email, tenantId: tenant.id });
      
      // Create user if not exists
      if (!user) {
        user = this.em.create(User, {
          email,
          // For LDAP users, we don't store the password locally
          password: Math.random().toString(36).substring(2, 15),
          profile: {
            firstName,
            lastName,
          },
          tenantId: tenant.id,
          tenant,
          status: UserStatus.ACTIVE,
          // Store LDAP-specific fields in a custom attribute
          ldapUsername: username,
        });
        
        await this.em.persistAndFlush(user);
      }
      
      // Update user profile if needed
      if (user.profile.firstName !== firstName || user.profile.lastName !== lastName) {
        user.profile.firstName = firstName;
        user.profile.lastName = lastName;
        await this.em.flush();
      }
      
      return user;
    } catch (error) {
      throw new UnauthorizedException('LDAP authentication failed');
    }
  }
  
  /**
   * Create default tenant for LDAP users if needed
   */
  private async createDefaultTenant(): Promise<Tenant> {
    const defaultTenantName = this.configService.get('ldap.defaultTenantName', 'ldap');
    const defaultTenantDomain = this.configService.get('ldap.defaultTenantDomain', 'ldap.domain');
    
    const tenant = this.em.create(Tenant, {
      name: defaultTenantName,
      domain: defaultTenantDomain,
      status: TenantStatus.ACTIVE,
    });
    
    await this.em.persistAndFlush(tenant);
    return tenant;
  }
}
```

### Authentication Service (Update for LDAP)

```typescript
// src/backend/src/auth/services/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../users/services/user.service';
import { User } from '../../users/entities/user.entity';
import { RefreshTokenService } from './refresh-token.service';
import { MfaService } from './mfa.service';
import { LoginDto, JwtPayload, AuthResponse } from '../types/auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly mfaService: MfaService,
  ) {}

  /**
   * Validate user credentials
   *
   * @param email User email
   * @param password User password
   * @param tenantId Tenant ID
   * @returns Validated user or null
   */
  async validateUser(email: string, password: string, tenantId: string): Promise<any> {
    const user = await this.userService.findByEmail(email, tenantId);
    if (user && await this.userService.validatePassword(password, user.password)) {
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
  async login(user: User, mfaCode?: string): Promise<AuthResponse> {
    // Check MFA if enabled
    if (user.mfaEnabled) {
      if (!mfaCode) {
        return { requiresMfa: true };
      }
      
      const isMfaValid = await this.mfaService.verifyToken(user.id, mfaCode);
      if (!isMfaValid) {
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    // Generate JWT payload
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles.getItems().map(role => role.name),
    };

    // Generate tokens
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.refreshTokenService.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
        mfaEnabled: user.mfaEnabled,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   *
   * @param refreshToken Refresh token
   * @returns New access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const userData = await this.refreshTokenService.validateRefreshToken(refreshToken);
    if (!userData) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const payload: JwtPayload = {
      sub: userData.userId,
      email: userData.email,
      tenantId: userData.tenantId,
      roles: userData.roles,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  /**
   * Logout user
   *
   * @param userId User ID
   * @param refreshToken Refresh token to invalidate
   */
  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.refreshTokenService.revokeRefreshToken(refreshToken);
  }
}
```

### Auth Controller (Update for LDAP)

```typescript
// src/backend/src/auth/controllers/auth.controller.ts
import { 
  Controller, 
  Post, 
  UseGuards, 
  Request, 
  Body, 
  UnauthorizedException,
  Get,
  Req,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../services/auth.service';
import { MfaService } from '../services/mfa.service';
import { LoginDto, RefreshTokenDto, MfaDto, MfaSetupDto } from '../types/auth.types';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MfaService,
  ) {}

  @Post('login')
  @UseGuards(AuthGuard('local'))
  async login(@Request() req, @Body() loginDto: LoginDto) {
    return this.authService.login(req.user, loginDto.mfaCode);
  }

  @Post('ldap/login')
  @UseGuards(AuthGuard('ldap'))
  async ldapLogin(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('refresh')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user, @Body() refreshTokenDto: RefreshTokenDto) {
    await this.authService.logout(user.id, refreshTokenDto.refreshToken);
    return { message: 'Logout successful' };
  }

  @Get('oauth/google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Initiates the Google OAuth2 login flow
  }

  @Get('oauth/google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthCallback(@Request() req) {
    // Handle the Google OAuth2 callback
    return this.authService.login(req.user);
  }

  @Get('oauth/github')
  @UseGuards(AuthGuard('github'))
  githubAuth() {
    // Initiates the GitHub OAuth2 login flow
  }

  @Get('oauth/github/callback')
  @UseGuards(AuthGuard('github'))
  githubAuthCallback(@Request() req) {
    // Handle the GitHub OAuth2 callback
    return this.authService.login(req.user);
  }

  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  async setupMfa(@CurrentUser() user, @Body() mfaSetupDto: MfaSetupDto) {
    return this.mfaService.setupMfa(user.id, user.tenantId);
  }

  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  async verifyMfa(@CurrentUser() user, @Body() mfaDto: MfaDto) {
    const isValid = await this.mfaService.verifyToken(user.id, mfaDto.mfaCode);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }
    
    return {
      success: true,
      message: 'MFA setup completed successfully',
    };
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  async disableMfa(@CurrentUser() user, @Body() mfaDto: MfaDto) {
    const isValid = await this.mfaService.verifyToken(user.id, mfaDto.mfaCode);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }
    
    await this.mfaService.disableMfa(user.id, user.tenantId);
    return {
      success: true,
      message: 'MFA disabled successfully',
    };
  }
}
```

### Configuration Update for LDAP

Add LDAP configuration to the config file:

```typescript
// src/backend/src/config/configuration.ts (excerpt)
export default () => ({
  // ... existing config
  
  // LDAP configuration
  ldap: {
    url: process.env.LDAP_URL || 'ldap://ldap.example.com:389',
    bindDN: process.env.LDAP_BIND_DN || 'cn=admin,dc=example,dc=com',
    bindCredentials: process.env.LDAP_BIND_CREDENTIALS || 'admin_password',
    searchBase: process.env.LDAP_SEARCH_BASE || 'ou=users,dc=example,dc=com',
    searchFilter: process.env.LDAP_SEARCH_FILTER || '(mail={{username}})',
    defaultTenantId: process.env.LDAP_DEFAULT_TENANT_ID || 'default',
    defaultTenantName: process.env.LDAP_DEFAULT_TENANT_NAME || 'ldap',
    defaultTenantDomain: process.env.LDAP_DEFAULT_TENANT_DOMAIN || 'ldap.domain',
  },
});
```

### Integration Tests

To ensure the authentication system works correctly under real-world conditions, we have implemented comprehensive integration tests using Testcontainers:

```typescript
// src/backend/test/utils/testcontainers/samba-ldap.container.ts
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

export class SambaLdapContainer extends GenericContainer {
  private static readonly DEFAULT_SAMBA_IMAGE = 'nowsci/samba-domain:4.15.9';
  private static readonly DEFAULT_SAMBA_PORT = 389;
  private static readonly DEFAULT_ADMIN_PASSWORD = 'Passw0rd';
  private static readonly DEFAULT_DOMAIN = 'EXAMPLE.COM';
  private static readonly DEFAULT_ADMIN_USER = 'Administrator';

  constructor(
    image: string = SambaLdapContainer.DEFAULT_SAMBA_IMAGE,
    adminPassword: string = SambaLdapContainer.DEFAULT_ADMIN_PASSWORD,
    domain: string = SambaLdapContainer.DEFAULT_DOMAIN,
  ) {
    super(image);

    this.withExposedPorts(
      SambaLdapContainer.DEFAULT_SAMBA_PORT, // LDAP
      636,  // LDAPS
      445,  // SMB
      135,  // RPC
      138,  // NetBIOS
      139,  // NetBIOS
    )
    .withEnvironment({
      'DOMAIN': domain,
      'ADMIN_PASSWORD': adminPassword,
      'INSECURE': 'true',
    })
    .withWaitStrategy(
      Wait.forLogMessage('[+] Samba Domain Controller started successfully')
    );
  }

  // Helper methods for LDAP connection parameters
  public getLdapUrl(started: StartedTestContainer): string {
    const host = started.getHost();
    const port = started.getMappedPort(SambaLdapContainer.DEFAULT_SAMBA_PORT);
    return `ldap://${host}:${port}`;
  }

  public getLdapBindDn(started: StartedTestContainer, domain: string = SambaLdapContainer.DEFAULT_DOMAIN): string {
    const dcComponents = domain.toLowerCase().split('.').map(part => `dc=${part}`).join(',');
    return `cn=${SambaLdapContainer.DEFAULT_ADMIN_USER},cn=Users,${dcComponents}`;
  }

  public getLdapSearchBase(started: StartedTestContainer, domain: string = SambaLdapContainer.DEFAULT_DOMAIN): string {
    return domain.toLowerCase().split('.').map(part => `dc=${part}`).join(',');
  }

  public getLdapSearchFilter(): string {
    return '(&(objectClass=user)(sAMAccountName={{username}}))';
  }
}

export type StartedSambaLdapContainerWithDetails = StartedTestContainer & {
  getLdapUrl: () => string;
  getLdapBindDn: (domain?: string) => string; 
  getLdapSearchBase: (domain?: string) => string;
  getLdapSearchFilter: () => string;
};

export async function startSambaLdapContainer(
  image?: string,
  adminPassword?: string,
  domain?: string,
): Promise<StartedSambaLdapContainerWithDetails> {
  const container = new SambaLdapContainer(image, adminPassword, domain);
  const startedContainer = await container.start();
  
  const sambaContainer: StartedSambaLdapContainerWithDetails = Object.assign(startedContainer, {
    getLdapUrl: () => container.getLdapUrl(startedContainer),
    getLdapBindDn: (domain?: string) => container.getLdapBindDn(startedContainer, domain),
    getLdapSearchBase: (domain?: string) => container.getLdapSearchBase(startedContainer, domain),
    getLdapSearchFilter: () => container.getLdapSearchFilter(),
  });
  
  return sambaContainer;
}
```

These integration tests cover all the authentication mechanisms implemented in the system:

1. **LDAP Authentication Tests**: Test authentication against a real LDAP server using Samba in a Docker container
2. **OAuth2 Authentication Tests**: Test OAuth2 login flow with Google and GitHub
3. **Refresh Token Tests**: Test token refresh, rotation, and invalidation
4. **MFA Tests**: Test TOTP-based multi-factor authentication flow

The integration tests ensure that the authentication systems work correctly with real-world services and validate edge cases like invalid credentials, token expiration, and MFA validation.

## Constraints

- The implementation must comply with OWASP Top 10 security standards
- JWT secrets must be configurable via environment variables and should never be stored in code or Git repository
- OAuth2 provider credentials must be securely managed
- All passwords must be hashed with bcrypt or a comparable algorithm
- Tokens must have an appropriate expiration time (15 minutes for JWT, 7 days for refresh tokens)
- MFA secrets must be encrypted in the database
- Rate limiting must be implemented for all authentication endpoints
- LDAP connections must use TLS/SSL for secure communication

## References

- Story-9: CI/CD Pipeline for Testcontainers-based Tests
- `.ai/prd.md`: Section on Authentication and Authorization requirements
- `.ai/arch.md`: Authentication Flow Diagram and Technology Stack
- [OAuth2 Documentation](https://oauth.net/2/)
- [Passport.js Documentation](http://www.passportjs.org/)
- [JWT Documentation](https://jwt.io/introduction)
- [OWASP Authentication Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [LDAP Authentication Best Practices](https://ldap.com/ldap-security-best-practices/)
- [Testcontainers Documentation](https://www.testcontainers.org/)
- [Samba AD Documentation](https://wiki.samba.org/index.php/Setting_up_Samba_as_an_Active_Directory_Domain_Controller)

## Conclusion

The successful implementation of the authentication system is a fundamental building block for the ACCI Nest Enterprise Application Framework. It forms the basis for secure user authentication and authorization and enables seamless integration with various identity providers. The implementation of JWT, OAuth2, LDAP/AD, refresh tokens, and MFA ensures that the system meets modern security standards and provides users with a flexible and secure authentication experience.

The extensive integration test suite with Testcontainers ensures that the authentication mechanisms work correctly in real-world scenarios and provides confidence in the system's security and reliability.

## Chat Log
