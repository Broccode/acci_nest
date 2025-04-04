import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { MfaService } from './services/mfa.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { GithubStrategy } from './strategies/github.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LdapAuthStrategy } from './strategies/ldap.strategy';
import { LocalStrategy } from './strategies/local.strategy';

/**
 * Authentication Module
 * 
 * @description Provides authentication services and strategies
 */
@Module({
  imports: [
    // Configure Passport default strategy to JWT
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    // Configure JWT module with settings from config
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: {
          expiresIn: `${configService.get('jwt.expiresIn', 3600)}s`,
        },
      }),
    }),
    
    // Import the UsersModule to access user services
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
    LdapAuthStrategy,
  ],
  exports: [AuthService, JwtModule, RefreshTokenService, MfaService],
})
export class AuthModule {} 