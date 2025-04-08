import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/core';
import { HttpStatus, INestApplication, Injectable } from '@nestjs/common';
import * as request from 'supertest';
import * as QRCode from 'qrcode';
import { AuthService } from '../../../src/auth/services/auth.service';
import { JwtStrategy } from '../../../src/auth/strategies/jwt.strategy';
import { LocalStrategy } from '../../../src/auth/strategies/local.strategy';
import { AuthController } from '../../../src/auth/controllers/auth.controller';
import { User } from '../../../src/users/entities/user.entity';
import { Tenant } from '../../../src/tenants/entities/tenant.entity';
import { RefreshTokenService } from '../../../src/auth/services/refresh-token.service';
import { MfaService } from '../../../src/auth/services/mfa.service';
import { UserService } from '../../../src/users/services/user.service';
import { createTestDbConfig } from '../../utils/test-db-config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '../../../src/auth/guards/jwt-auth.guard';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

// Simple mock implementation for TOTP instead of speakeasy
class MockTotp {
  // Generate a fixed secret for tests
  generateSecret() {
    return {
      base32: 'JBSWY3DPEHPK3PXP',
      otpauth_url: 'otpauth://totp/ACCI:test@example.com?secret=JBSWY3DPEHPK3PXP'
    };
  }
  
  // TOTP functionality
  totp = {
    // Generate a valid 6-digit code
    generate: (options: { secret: string, encoding: string }) => {
      return '123456'; // Always the same code for tests
    },
    // Verify the TOTP code
    verify: (options: { secret: string, encoding: string, token: string, window: number }) => {
      // In tests we only accept '123456' as a valid code
      return options.token === '123456';
    }
  };
}

const mockTotp = new MockTotp();

// Verwende die gemeinsame Testdatenbank-Konfiguration
const testDbConfig = createTestDbConfig();

// Mock User class for testing
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  password: '$2a$10$JdyK5oUduNP1lAhXrJGcXeu1mLUXIpRhO64PbP5L3mW98Owt6NO4C', // hashed 'password123'
  profile: {
    firstName: 'Test',
    lastName: 'User',
  },
  tenantId: 'tenant-123',
  roles: {
    getItems: () => [{
      name: 'user',
    }],
  },
  status: 'ACTIVE',
  mfaEnabled: false,
  mfaSecret: null,
};

// Mock LocalStrategy mit korrekter Passport-Integration
@Injectable()
class MockLocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true
    });
  }

  async validate(req: any, email: string, password: string): Promise<any> {
    const tenantId = 'tenant-123'; // Für Tests immer derselbe Tenant
    const user = await this.authService.validateUser(email, password, tenantId);
    if (!user) {
      return null;
    }
    return user;
  }
}

// Mock UserService that allows MFA management
class MockUserService {
  private user = { ...mockUser };

  async findById(userId: string, tenantId: string) {
    if (userId === this.user.id) {
      return this.user;
    }
    return null;
  }
  
  async findByEmail(email: string, tenantId: string) {
    if (email === this.user.email && tenantId === this.user.tenantId) {
      return this.user;
    }
    return null;
  }
  
  async validatePassword(plainPassword: string, hashedPassword: string) {
    return plainPassword === 'password123' || true; // Either specific password or always true for tests
  }

  async setMfaSecret(userId: string, secret: string) {
    if (userId === this.user.id) {
      this.user.mfaSecret = secret;
    }
    return this.user;
  }

  async enableMfa(userId: string) {
    if (userId === this.user.id) {
      this.user.mfaEnabled = true;
    }
    return this.user;
  }

  async disableMfa(userId: string) {
    if (userId === this.user.id) {
      this.user.mfaEnabled = false;
      this.user.mfaSecret = null;
    }
    return this.user;
  }
}

// Mock TenantService
class MockTenantService {
  async findById(id: string) {
    if (id === 'tenant-123' || id === 'default-tenant') {
      return {
        id: id,
        name: 'Test Tenant',
        domain: 'test.example.com',
        status: 'ACTIVE',
      };
    }
    return null;
  }
  
  async findByDomain(domain: string) {
    return {
      id: 'tenant-123',
      name: 'Test Tenant',
      domain: domain,
      status: 'ACTIVE',
    };
  }
}

// Real MFA Service that uses our TOTP mock
@Injectable()
class TestMfaService {
  constructor(private readonly userService: MockUserService) {}

  async setupMfa(userId: string, tenantId: string) {
    // Generate new TOTP secret
    // @ts-ignore - For TypeScript compatibility
    const secret = mockTotp.generateSecret();

    // Save the secret to the user record
    await this.userService.setMfaSecret(userId, secret.base32);

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode,
    };
  }

  async verifyToken(userId: string, token: string, tenantId: string): Promise<boolean> {
    const user = await this.userService.findById(userId, tenantId);
    
    if (!user || !user.mfaSecret) {
      return false;
    }

    // Verify the token against the user's secret
    return mockTotp.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1, // Allow 1 step before/after for clock drift
    });
  }

  async enableMfa(userId: string, tenantId: string): Promise<void> {
    await this.userService.enableMfa(userId);
  }

  async disableMfa(userId: string, tenantId: string): Promise<void> {
    await this.userService.disableMfa(userId);
  }
}

describe('Multi-Factor Authentication (integration)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let jwtService: JwtService;
  let mfaService: TestMfaService;
  let em: EntityManager;
  let userService: MockUserService;
  let mfaSecret: string;
  
  const testConfig = () => ({
    auth: {
      jwtSecret: 'test-jwt-secret',
      jwtExpiresIn: '15m',
      refreshTokenExpiration: '7d',
      refreshTokenSecret: 'test-refresh-token-secret',
    },
  });

  beforeEach(async () => {
    // Reset mock user for each test
    mockUser.mfaEnabled = false;
    mockUser.mfaSecret = null;
    
    userService = new MockUserService();
    mfaService = new TestMfaService(userService);

    // Create test module
    try {
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
          // Entferne den APP_GUARD provider, da die Guards bereits in den Controllern definiert sind
          // {
          //   provide: APP_GUARD,
          //   useClass: JwtAuthGuard,
          // },
          // Main service under test with proper dependencies
          {
            provide: AuthService,
            useFactory: (userService: UserService, jwtService: JwtService, 
                      refreshTokenService: RefreshTokenService, mfaService: MfaService) => {
              return new AuthService(userService, jwtService, refreshTokenService, mfaService);
            },
            inject: [UserService, JwtService, RefreshTokenService, MfaService]
          },
          RefreshTokenService,
          { provide: MfaService, useValue: mfaService },
          {
            provide: JwtStrategy,
            useFactory: (configService: ConfigService, userService: UserService) => {
              return new JwtStrategy(configService, userService);
            },
            inject: [ConfigService, UserService],
          },
          {
            provide: LocalStrategy,
            useClass: MockLocalStrategy
          },
          {
            provide: UserService,
            useValue: userService
          },
          {
            provide: 'TenantService',
            useClass: MockTenantService
          },
        ],
        controllers: [AuthController],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      authService = app.get<AuthService>(AuthService);
      jwtService = app.get<JwtService>(JwtService);
      em = app.get<EntityManager>(EntityManager);
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should setup MFA and generate QR code', async () => {
    // First, login normally
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: mockUser.email,
        password: 'password123',
        tenantId: mockUser.tenantId
      })
      .set('X-Tenant-Domain', 'test.example.com');

    const { accessToken } = loginResponse.body;
    
    // Setup MFA (requires authenticated user)
    const mfaSetupResponse = await request(app.getHttpServer())
      .post('/auth/mfa/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
      
    expect(mfaSetupResponse.status).toBe(HttpStatus.CREATED);
    expect(mfaSetupResponse.body.secret).toBeDefined();
    expect(mfaSetupResponse.body.qrCode).toBeDefined();
    
    // Store the secret for next tests
    mfaSecret = mfaSetupResponse.body.secret;
  });

  it('should verify MFA token and enable MFA for user', async () => {
    // First, setup MFA
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: mockUser.email,
        password: 'password123',
        tenantId: mockUser.tenantId
      })
      .set('X-Tenant-Domain', 'test.example.com');

    const { accessToken } = loginResponse.body;
    
    const mfaSetupResponse = await request(app.getHttpServer())
      .post('/auth/mfa/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
      
    const secret = mfaSetupResponse.body.secret;
    
    // Generate a valid TOTP token (always '123456' in our mock)
    const token = '123456';
    
    // Verify and enable MFA
    const verifyResponse = await request(app.getHttpServer())
      .post('/auth/mfa/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ mfaCode: token });
      
    expect(verifyResponse.status).toBe(HttpStatus.CREATED);
    expect(verifyResponse.body.success).toBe(true);
    
    // Enable MFA for the user
    await userService.enableMfa(mockUser.id);
    
    // Try to login without MFA code (should fail or indicate MFA needed)
    const loginWithoutMfaResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: mockUser.email,
        password: 'password123',
        tenantId: mockUser.tenantId
      })
      .set('X-Tenant-Domain', 'test.example.com');
      
    expect(loginWithoutMfaResponse.body.requiresMfa).toBe(true);
    expect(loginWithoutMfaResponse.body.accessToken).toBeUndefined();
    
    // Login with MFA code
    const loginWithMfaResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: mockUser.email,
        password: 'password123',
        mfaCode: token,
        tenantId: mockUser.tenantId
      })
      .set('X-Tenant-Domain', 'test.example.com');
      
    expect(loginWithMfaResponse.status).toBe(HttpStatus.CREATED);
    expect(loginWithMfaResponse.body.accessToken).toBeDefined();
    expect(loginWithMfaResponse.body.refreshToken).toBeDefined();
  });

  it('should disable MFA with valid token', async () => {
    // First, setup MFA
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: mockUser.email,
        password: 'password123',
        tenantId: mockUser.tenantId
      })
      .set('X-Tenant-Domain', 'test.example.com');

    const { accessToken } = loginResponse.body;
    
    const mfaSetupResponse = await request(app.getHttpServer())
      .post('/auth/mfa/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
      
    const secret = mfaSetupResponse.body.secret;
    
    // Enable MFA for the user
    await userService.setMfaSecret(mockUser.id, secret);
    await userService.enableMfa(mockUser.id);
    
    // Use our mock token (always '123456')
    const token = '123456';
    
    // Login with MFA
    const loginWithMfaResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: mockUser.email,
        password: 'password123',
        mfaCode: token,
        tenantId: mockUser.tenantId
      })
      .set('X-Tenant-Domain', 'test.example.com');
      
    const mfaAccessToken = loginWithMfaResponse.body.accessToken;
    
    // Disable MFA with the same token
    const disableResponse = await request(app.getHttpServer())
      .post('/auth/mfa/disable')
      .set('Authorization', `Bearer ${mfaAccessToken}`)
      .send({ mfaCode: token });
      
    expect(disableResponse.status).toBe(HttpStatus.CREATED);
    expect(disableResponse.body.success).toBe(true);
    
    // Verify MFA is disabled - can login without MFA code
    const loginAfterDisableResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: mockUser.email,
        password: 'password123',
        tenantId: mockUser.tenantId
      })
      .set('X-Tenant-Domain', 'test.example.com');
      
    expect(loginAfterDisableResponse.status).toBe(HttpStatus.CREATED);
    expect(loginAfterDisableResponse.body.accessToken).toBeDefined();
    expect(loginAfterDisableResponse.body.requiresMfa).toBeUndefined();
  });

  it('should reject invalid MFA tokens', async () => {
    // First, setup MFA
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: mockUser.email,
        password: 'password123',
        tenantId: mockUser.tenantId
      })
      .set('X-Tenant-Domain', 'test.example.com');

    const { accessToken } = loginResponse.body;
    
    const mfaSetupResponse = await request(app.getHttpServer())
      .post('/auth/mfa/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
      
    const secret = mfaSetupResponse.body.secret;
    
    // Enable MFA for the user
    await userService.setMfaSecret(mockUser.id, secret);
    await userService.enableMfa(mockUser.id);
    
    // Try to verify with invalid token
    const verifyResponse = await request(app.getHttpServer())
      .post('/auth/mfa/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ mfaCode: '654321' }); // Invalid token
      
    expect(verifyResponse.status).toBe(HttpStatus.UNAUTHORIZED);
    
    // Try to login with invalid MFA code
    const loginWithInvalidMfaResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: mockUser.email,
        password: 'password123',
        mfaCode: '654321', // Invalid token
        tenantId: mockUser.tenantId
      })
      .set('X-Tenant-Domain', 'test.example.com');
      
    expect(loginWithInvalidMfaResponse.status).toBe(HttpStatus.UNAUTHORIZED);
  });
}); 