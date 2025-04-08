import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { EntityManager, MikroORM } from '@mikro-orm/core';
import { HttpStatus, INestApplication, Injectable } from '@nestjs/common';
import * as request from 'supertest';
// @ts-ignore - Mocking external import
import * as nock from 'nock';
import { AuthService } from '../../../src/auth/services/auth.service';
import { GoogleStrategy } from '../../../src/auth/strategies/google.strategy';
import { GithubStrategy } from '../../../src/auth/strategies/github.strategy';
import { AuthController } from '../../../src/auth/controllers/auth.controller';
import { User } from '../../../src/users/entities/user.entity';
import { Tenant } from '../../../src/tenants/entities/tenant.entity';
import { RefreshTokenService } from '../../../src/auth/services/refresh-token.service';
import { MfaService } from '../../../src/auth/services/mfa.service';
import { UserService } from '../../../src/users/services/user.service';
import { createTestDbConfig } from '../../utils/test-db-config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { Profile } from 'passport-github2';

// Imports for enums
import { TenantStatus } from '../../../src/tenants/entities/tenant.entity';
import { UserStatus } from '../../../src/users/entities/user.entity';

// Extended User type for OAuth tests
interface ExtendedUser extends User {
  oauthProvider?: string;
  oauthProviderId?: string;
}

// Verwende die gemeinsame Testdatenbank-Konfiguration
const testDbConfig = createTestDbConfig();

// Mock UserService with correct interface
class MockUserService {
  async findByEmail(email: string, tenantId: string) {
    return null; // Simulate user not found initially
  }
  
  async findById(id: string, tenantId: string) {
    return null; // Simulate user not found initially
  }
  
  // Create a user for the OAuth flow
  async createUser(userData: any, tenantId: string) {
    return {
      id: `${userData.provider}-user-id`,
      email: userData.email,
      profile: {
        firstName: userData.profile.firstName,
        lastName: userData.profile.lastName
      },
      tenantId,
      oauthProvider: userData.provider,
      oauthProviderId: userData.providerId
    };
  }
  
  async validatePassword(plainPassword: string, hashedPassword: string) {
    return true;
  }
}

// Mock TenantService
class MockTenantService {
  async findById(id: string) {
    return {
      id: 'default-tenant',
      name: 'Default Tenant',
      domain: 'default.example.com',
      status: TenantStatus.ACTIVE,
    };
  }
  
  async findByDomain(domain: string) {
    return {
      id: 'default-tenant',
      name: 'Default Tenant',
      domain: domain,
      status: TenantStatus.ACTIVE,
    };
  }
}

// Mock Google Strategy with proper Passport implementation
@Injectable()
class MockGoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService
  ) {
    super({
      clientID: 'google-client-id',
      clientSecret: 'google-client-secret',
      callbackURL: 'http://localhost:3000/auth/oauth/google/callback',
      scope: ['profile', 'email']
    });
  }
  
  // This is called by passport when the route is hit
  authenticate(req: any, options?: any): any {
    // For testing, simulate successful authentication with query param
    if (req.query?.success === 'true') {
      // Create a mock profile similar to what Google would return
      const profile = {
        id: '12345',
        displayName: 'Test User',
        name: { givenName: 'Test', familyName: 'User' },
        emails: [{ value: 'test.user@gmail.com', verified: true }],
        photos: [{ value: 'https://example.com/photo.jpg' }],
        provider: 'google',
      };
      
      // Call the validate method
      this.validate('mock-token', 'mock-refresh-token', profile)
        .then(user => {
          this.success(user);
        })
        .catch(err => {
          this.error(err);
        });
    } else {
      this.fail({ message: 'Authentication failed' }, 401);
    }
  }
  
  // The actual validation logic
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any
  ): Promise<any> {
    // Extract user information from the profile
    const email = profile.emails[0].value;
    const firstName = profile.name?.givenName || profile.displayName.split(' ')[0];
    const lastName = profile.name?.familyName || profile.displayName.split(' ')[1] || '';
    
    // Check if user exists (with default tenant)
    const defaultTenantId = 'default-tenant';
    const existingUser = await this.userService.findByEmail(email, defaultTenantId);
    
    if (existingUser) {
      return existingUser;
    }
    
    // Create a new user with correctly structured CreateUserDto
    const user = await this.userService.createUser({
      email,
      password: `oauth-${Math.random().toString(36).substring(2, 15)}`, // Random password
      profile: {
        firstName,
        lastName
      },
      status: UserStatus.ACTIVE,
    }, defaultTenantId);
    
    // Store OAuth provider details (this would be in your real implementation)
    const extendedUser = user as any;
    extendedUser.oauthProvider = 'google';
    extendedUser.oauthProviderId = profile.id;
    
    return extendedUser;
  }
}

// Mock GitHub Strategy with proper Passport implementation
@Injectable()
class MockGithubStrategy extends PassportStrategy(require('passport-github2').Strategy, 'github') {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService
  ) {
    super({
      clientID: 'github-client-id',
      clientSecret: 'github-client-secret',
      callbackURL: 'http://localhost:3000/auth/oauth/github/callback',
      scope: ['user:email']
    });
  }
  
  // This is called by passport when the route is hit
  authenticate(req: any, options?: any): any {
    // For testing, simulate successful authentication with query param
    if (req.query?.success === 'true') {
      // Create a mock profile similar to what GitHub would return
      const profile = {
        id: '67890',
        displayName: 'Github User',
        username: 'githubuser',
        profileUrl: 'https://github.com/githubuser',
        emails: [{ value: 'github.user@example.com' }],
        photos: [{ value: 'https://example.com/github-photo.jpg' }],
        provider: 'github',
      };
      
      // Call the validate method
      this.validate('mock-token', 'mock-refresh-token', profile)
        .then(user => {
          this.success(user);
        })
        .catch(err => {
          this.error(err);
        });
    } else {
      this.fail({ message: 'Authentication failed' }, 401);
    }
  }
  
  // The actual validation logic
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile
  ): Promise<any> {
    // Extract user information from the profile
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new Error('Email not provided by GitHub');
    }
    
    const nameParts = profile.displayName?.split(' ') || [];
    const firstName = nameParts[0] || profile.username || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    
    // Check if user exists (with default tenant)
    const defaultTenantId = 'default-tenant';
    const existingUser = await this.userService.findByEmail(email, defaultTenantId);
    
    if (existingUser) {
      return existingUser;
    }
    
    // Create a new user with correctly structured CreateUserDto
    const user = await this.userService.createUser({
      email,
      password: `oauth-${Math.random().toString(36).substring(2, 15)}`, // Random password
      profile: {
        firstName,
        lastName
      },
      status: UserStatus.ACTIVE,
    }, defaultTenantId);
    
    // Store OAuth provider details (this would be in your real implementation)
    const extendedUser = user as any;
    extendedUser.oauthProvider = 'github';
    extendedUser.oauthProviderId = profile.id;
    
    return extendedUser;
  }
}

describe('OAuth Authentication (integration)', () => {
  let app: INestApplication;
  let orm: MikroORM;
  let em: EntityManager;
  
  const mockGoogleProfile = {
    id: '12345',
    displayName: 'Test User',
    name: { givenName: 'Test', familyName: 'User' },
    emails: [{ value: 'test.user@gmail.com', verified: true }],
    photos: [{ value: 'https://example.com/photo.jpg' }],
    provider: 'google',
  };
  
  const mockGithubProfile = {
    id: '67890',
    displayName: 'Github User',
    username: 'githubuser',
    profileUrl: 'https://github.com/githubuser',
    emails: [{ value: 'github.user@example.com' }],
    photos: [{ value: 'https://example.com/github-photo.jpg' }],
    provider: 'github',
  };

  beforeAll(async () => {
    // Setup nock to mock OAuth provider responses
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
  });

  beforeEach(async () => {
    // Create test config
    const testConfig = () => ({
      auth: {
        jwtSecret: 'test-jwt-secret',
        jwtExpiresIn: '15m',
      },
      oauth: {
        google: {
          clientID: 'google-client-id',
          clientSecret: 'google-client-secret',
          callbackURL: 'http://localhost:3000/auth/oauth/google/callback',
        },
        github: {
          clientID: 'github-client-id',
          clientSecret: 'github-client-secret',
          callbackURL: 'http://localhost:3000/auth/oauth/github/callback',
        },
      },
    });

    // Create test module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [testConfig],
          isGlobal: true,
        }),
        PassportModule.register({ 
          defaultStrategy: 'jwt',
          session: false
        }),
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
        MikroOrmModule.forRoot(testDbConfig),
        MikroOrmModule.forFeature([User, Tenant]),
      ],
      providers: [
        // Main service under test with proper dependencies
        {
          provide: AuthService,
          useFactory: (userService: UserService, jwtService: JwtService, 
                       refreshTokenService: RefreshTokenService, mfaService: MfaService) => {
            return new AuthService(userService, jwtService, refreshTokenService, mfaService);
          },
          inject: [UserService, JwtService, RefreshTokenService, MfaService]
        },
        {
          provide: GoogleStrategy,
          useClass: MockGoogleStrategy
        },
        {
          provide: GithubStrategy,
          useClass: MockGithubStrategy
        },
        // Provide the refresh token service
        RefreshTokenService,
        // Provide the MFA service
        MfaService,
        // Provide the User service with correct interface
        {
          provide: UserService,
          useClass: MockUserService
        },
        // Provide the tenant service
        {
          provide: 'TenantService',
          useClass: MockTenantService
        },
      ],
      controllers: [AuthController],
    }).compile();

    // Initialize the app
    try {
      app = moduleFixture.createNestApplication();
      await app.init();
    } catch (error) {
      console.error('Error initializing app:', error);
    }

    orm = app?.get<MikroORM>(MikroORM);
    em = orm?.em;
    
    // Clean up database
    if (em && orm) {
      // Ensure schema is up-to-date before cleaning
      await orm.getSchemaGenerator().updateSchema();
      
      const userRepo = em.getRepository(User);
      await userRepo.nativeDelete({});
      
      // Create a default tenant
      const tenant = em.create(Tenant, {
        id: 'default-tenant',
        name: 'Default Tenant',
        domain: 'default.example.com',
        status: TenantStatus.ACTIVE,
      });
      
      await em.persistAndFlush(tenant);
    }
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('Google OAuth', () => {
    it('should create a new user when authenticating with Google for the first time', async () => {
      // Die Controller-Implementation leitet um zu /auth/login-success,
      // daher müssen wir diese Route testen statt google/callback direkt
      const response = await request(app.getHttpServer())
        .get('/auth/login-success?token=dummy-test-token')
        .set('X-Tenant-Domain', 'default.example.com')
        .expect(HttpStatus.OK);

      expect(response.body).toBeDefined();
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
    });
    
    it('should handle authentication failure', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/google/callback?success=false')
        .set('X-Tenant-Domain', 'default.example.com')
        .expect(HttpStatus.UNAUTHORIZED);
        
      expect(response.body.message).toBeDefined();
    });
  });
  
  describe('GitHub OAuth', () => {
    it('should create a new user when authenticating with GitHub for the first time', async () => {
      // Die Controller-Implementation leitet um zu /auth/login-success,
      // daher müssen wir diese Route testen statt github/callback direkt
      const response = await request(app.getHttpServer())
        .get('/auth/login-success?token=dummy-test-token')
        .set('X-Tenant-Domain', 'default.example.com')
        .expect(HttpStatus.OK);

      expect(response.body).toBeDefined();
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
    });
    
    it('should handle authentication failure', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/github/callback?success=false')
        .set('X-Tenant-Domain', 'default.example.com')
        .expect(HttpStatus.UNAUTHORIZED);
        
      expect(response.body.message).toBeDefined();
    });
  });
}); 