import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HttpStatus, INestApplication, UnauthorizedException, Injectable } from '@nestjs/common';
import * as request from 'supertest';
import { AuthService } from '../../../src/auth/services/auth.service';
import { LdapAuthStrategy } from '../../../src/auth/strategies/ldap.strategy';
import { AuthController } from '../../../src/auth/controllers/auth.controller';
import { User } from '../../../src/users/entities/user.entity';
import { Tenant } from '../../../src/tenants/entities/tenant.entity';
import { RefreshTokenService } from '../../../src/auth/services/refresh-token.service';
import { MfaService } from '../../../src/auth/services/mfa.service';
import { UserService } from '../../../src/users/services/user.service';
import { createTestDbConfig } from '../../utils/test-db-config';
import { PassportStrategy } from '@nestjs/passport';
import { LdapUserProfile } from '../../../src/auth/types/ldap.types';
// Verwende require für Passport-LDAP, da es Probleme mit den TypeScript-Typen gibt
const LdapStrategy = require('passport-ldapauth').Strategy;

// Verwende die gemeinsame Testdatenbank-Konfiguration
const testDbConfig = createTestDbConfig();

// Test user configuration
const TEST_USER_EMAIL = 'testuser@example.org';
const TEST_USER_PASSWORD = 'password123';

// Mock UserService
class MockUserService {
  private users: Record<string, any> = {};

  constructor() {
    // Pre-populate with test user
    this.users[TEST_USER_EMAIL.toLowerCase()] = {
      id: 'ldap-test-user-id',
      email: TEST_USER_EMAIL,
      username: TEST_USER_EMAIL.split('@')[0],
      password: 'hashedPassword', // Placeholder, not used for LDAP auth
      tenantId: 'default-tenant',
      roles: {
        getItems: () => [{ name: 'user' }], 
      },
      mfaEnabled: false, 
    };
    console.log(`MockUserService initialized with test user: ${TEST_USER_EMAIL}`);
  }

  async findByEmail(email: string): Promise<any | null> {
    const lowerCaseEmail = email.toLowerCase();
    console.log(`MockUserService: findByEmail called for ${lowerCaseEmail}`);
    const foundUser = this.users[lowerCaseEmail];
    if (foundUser) {
      console.log(`MockUserService: Found user for ${email} with ID ${foundUser.id}`);
      return { ...foundUser }; 
    } else {
      console.log(`MockUserService: User not found for ${email}`);
      return null;
    }
  }

  async findById(id: string): Promise<any | null> {
    console.log(`MockUserService: findById called for ${id}`);
    const foundUser = Object.values(this.users).find(u => u.id === id);
     if (foundUser) {
      console.log(`MockUserService: Found user for ID ${id}: ${foundUser.email}`);
      return { ...foundUser };
    } else {
       console.log(`MockUserService: User not found for ID ${id}`);
      return null;
    }
  }

  async validatePassword(): Promise<boolean> {
    console.warn('MockUserService: validatePassword was unexpectedly called during LDAP test flow.');
    return false; 
  }
  
  async getUserRoles(userId: string): Promise<string[]> {
      const user = await this.findById(userId);
      return user ? user.roles.getItems().map((r: any) => r.name) : [];
  }
}

// Mock TenantService
class MockTenantService {
  async findById() {
    return {
      id: 'default-tenant',
      name: 'Default Tenant',
      domain: 'default.example.com',
      status: 'ACTIVE',
    };
  }
}

// Mock LDAP Strategy implementierung mit korrekter Passport-Integration
@Injectable()
class MockLdapAuthStrategy extends PassportStrategy(LdapStrategy, 'ldap') {
  constructor(private readonly userService: UserService) {
    // Konfiguriere die LDAP-Strategie mit Test-Einstellungen
    super({
      server: {
        url: 'ldap://localhost:389',
        bindDN: 'cn=admin,dc=example,dc=org',
        bindCredentials: 'adminpassword',
        searchBase: 'dc=example,dc=org',
        searchFilter: '(mail={{username}})',
        searchAttributes: ['displayName', 'mail', 'givenName', 'sn'],
        tlsOptions: {
          rejectUnauthorized: false,
        }
      },
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  // Diese Methode wird von der eigentlichen LDAP-Strategie aufgerufen und ist hier überschrieben
  // um die tatsächlichen LDAP-Anfragen zu mocken
  authenticate(req: any, options?: any): any {
    console.log('MockLdapAuthStrategy.authenticate called');
    
    const email = req.body.email;
    const password = req.body.password;
    
    if (email === TEST_USER_EMAIL && password === TEST_USER_PASSWORD) {
      // Erstelle ein Mock-LDAP-Profil
      const ldapProfile: LdapUserProfile = {
        mail: TEST_USER_EMAIL,
        displayName: 'Test User',
        givenName: 'Test',
        sn: 'User',
      };
      
      // Rufe die validate-Methode auf
      this.validate(ldapProfile, null)  // Zweites Argument hinzugefügt für Passport-Kompatibilität
        .then(user => {
          this.success(user);
        })
        .catch(err => {
          this.error(err);
        });
    } else {
      this.error(new UnauthorizedException('Invalid credentials'));
    }
  }

  // Diese Methode wird nach erfolgreicher LDAP-Authentifizierung aufgerufen
  async validate(ldapUser: LdapUserProfile, done: any): Promise<any> {
    console.log('MockLdapAuthStrategy.validate called with profile');
    
    if (!ldapUser.mail) {
      throw new UnauthorizedException('Email not provided');
    }
    
    // Suche den Benutzer in der Datenbank - Füge das benötigte tenantId-Argument hinzu
    const defaultTenantId = 'default-tenant';
    const user = await this.userService.findByEmail(ldapUser.mail, defaultTenantId);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    return user;
  }
}

describe('LDAP Authentication (integration)', () => {
  let app: INestApplication;
  let authService: AuthService;
  
  const testConfig = () => ({
    auth: {
      jwtSecret: 'test-jwt-secret',
      jwtExpiresIn: '15m',
      refreshTokenSecret: 'test-refresh-token-secret',
      refreshTokenExpiresIn: '7d'
    },
    ldap: {
      url: 'ldap://localhost:389',
      bindDN: 'cn=admin,dc=example,dc=org',
      bindCredentials: 'adminpassword',
      searchBase: 'dc=example,dc=org',
      searchFilter: '(mail={{username}})',
      defaultTenantId: 'default-tenant',
      defaultTenantName: 'ldap',
      defaultTenantDomain: 'ldap.domain',
    },
  });

  beforeEach(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [testConfig],
            isGlobal: true,
          }),
          PassportModule.register({ 
            defaultStrategy: 'jwt',
            // Wichtig: hier registrieren wir unsere LDAP-Strategie
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
            useFactory: (userService, jwtService, refreshTokenService, mfaService) => {
              return new AuthService(userService, jwtService, refreshTokenService, mfaService);
            },
            inject: [UserService, JwtService, RefreshTokenService, MfaService]
          },
          // Use our mock LDAP strategy to avoid real LDAP connections
          {
            provide: LdapAuthStrategy,
            useClass: MockLdapAuthStrategy
          },
          RefreshTokenService,
          MfaService,
          {
            provide: UserService,
            useClass: MockUserService
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
      console.log('Test app initialized with mock LDAP strategy');
    } catch (error) {
      console.error('Error initializing app:', error);
      throw error;
    }
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should authenticate with valid LDAP credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/ldap/login')
      .send({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD })
      .set('X-Tenant-Domain', 'default.example.com');
      
    // Check authentication response
    expect(response.status).toBe(HttpStatus.CREATED);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
  });

  it('should reject invalid LDAP credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/ldap/login')
      .send({ email: TEST_USER_EMAIL, password: 'wrongpassword' }) // Invalid password
      .set('X-Tenant-Domain', 'default.example.com');
      
    // Should reject with unauthorized
    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
  });
}); 