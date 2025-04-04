# Epic-2 - Story-10

Authentication System Implementation

**As a** developer
**I want to** implement a comprehensive authentication system
**so that** users can securely log in to the application and manage their sessions.

## Status

Draft

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

4. **Refresh Token Mechanism**
   - Implementation of refresh tokens for enhanced security
   - Token rotation and invalidation
   - Secure token storage

5. **Multi-Factor Authentication (MFA)**
   - Implementation of TOTP (Time-based One-Time Password)
   - QR code generation for authenticator app integration
   - MFA activation/deactivation

6. **Guards and Decorators**
   - Implementation of authentication guards
   - Tenant-aware authentication
   - Custom decorators for access control

7. **Test Coverage**
   - Unit tests for authentication logic
   - Integration tests with simulated authentication flows
   - E2E tests for critical authentication paths

## Estimation

Story Points: 8

## Tasks

1. - [ ] JWT Authentication
   1. - [ ] Set up JWT module and service
   2. - [ ] Implement token generation
   3. - [ ] Implement token validation
   4. - [ ] Write unit tests for JWT service

2. - [ ] Local Authentication with Passport.js
   1. - [ ] Create auth module and controller
   2. - [ ] Set up Local Strategy for Passport.js
   3. - [ ] Implement login/logout endpoints
   4. - [ ] Write tests for local authentication

3. - [ ] OAuth2/OpenID Connect
   1. - [ ] Install necessary dependencies
   2. - [ ] Implement Google OAuth2 strategy
   3. - [ ] Implement GitHub OAuth2 strategy
   4. - [ ] Implement callback handlers and profile synchronization
   5. - [ ] Write tests for OAuth2 authentication

4. - [ ] Refresh Token Mechanism
   1. - [ ] Implement refresh token generation
   2. - [ ] Create refresh endpoint for token renewal
   3. - [ ] Implement token rotation and blacklisting
   4. - [ ] Write tests for refresh token mechanism

5. - [ ] Multi-Factor Authentication
   1. - [ ] Integrate TOTP library
   2. - [ ] Implement MFA activation process
   3. - [ ] Set up QR code generation
   4. - [ ] Implement MFA validation during login
   5. - [ ] Write tests for MFA flow

6. - [ ] Guards and Decorators
   1. - [ ] Implement JwtAuthGuard
   2. - [ ] Implement TenantAuthGuard
   3. - [ ] Create CurrentUser decorator
   4. - [ ] Write tests for guards and decorators

7. - [ ] Documentation
   1. - [ ] Create API documentation with Swagger
   2. - [ ] Write authentication flow documentation
   3. - [ ] Update user manual for authentication

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
  ],
  exports: [AuthService, MfaService, JwtModule],
})
export class AuthModule {}
```

### Authentication Service

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

### JWT Strategy

```typescript
// src/backend/src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../users/services/user.service';
import { JwtPayload } from '../types/auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('auth.jwtSecret'),
    });
  }

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
```

### Auth Controller

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

### AppModule Update

We also need to update the AppModule to integrate the new AuthModule:

```typescript
// src/backend/src/app.module.ts (excerpt)
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // Existing modules...
    
    // Authentication module
    AuthModule,
    
    // Application modules
    TenantsModule,
    UsersModule,
    RedisModule,
  ],
  // ...
})
export class AppModule implements NestModule {
  // ...
}
```

## Constraints

- The implementation must comply with OWASP Top 10 security standards
- JWT secrets must be configurable via environment variables and should never be stored in code or Git repository
- OAuth2 provider credentials must be securely managed
- All passwords must be hashed with bcrypt or a comparable algorithm
- Tokens must have an appropriate expiration time (15 minutes for JWT, 7 days for refresh tokens)
- MFA secrets must be encrypted in the database
- Rate limiting must be implemented for all authentication endpoints

## References

- Story-9: CI/CD Pipeline for Testcontainers-based Tests
- `.ai/prd.md`: Section on Authentication and Authorization requirements
- `.ai/arch.md`: Authentication Flow Diagram and Technology Stack
- [OAuth2 Documentation](https://oauth.net/2/)
- [Passport.js Documentation](http://www.passportjs.org/)
- [JWT Documentation](https://jwt.io/introduction)
- [OWASP Authentication Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

## Conclusion

The successful implementation of the authentication system is a fundamental building block for the ACCI Nest Enterprise Application Framework. It forms the basis for secure user authentication and authorization and enables seamless integration with various identity providers. The implementation of JWT, OAuth2, refresh tokens, and MFA ensures that the system meets modern security standards and provides users with a flexible and secure authentication experience.

## Chat Log
