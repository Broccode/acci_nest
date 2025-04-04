import { User } from '../../users/entities/user.entity';

/**
 * Login DTO interface for user authentication
 */
export class LoginDto {
  /**
   * User email
   * @example "user@example.com"
   */
  email!: string;
  
  /**
   * User password
   * @example "securePassword123"
   */
  password!: string;
  
  /**
   * Tenant identifier
   * @example "tenant-123"
   */
  tenantId!: string;

  /**
   * Multi-factor authentication code (optional)
   * @example "123456"
   */
  mfaCode?: string;
}

/**
 * JWT token payload structure
 */
export interface JwtPayload {
  /**
   * User identifier
   */
  sub: string;
  
  /**
   * User email
   */
  email: string;
  
  /**
   * Tenant identifier
   */
  tenantId: string;
  
  /**
   * User roles
   */
  roles: string[];
  
  /**
   * Token issued at timestamp
   */
  iat?: number;
  
  /**
   * Token expiration timestamp
   */
  exp?: number;
}

/**
 * Refresh token DTO
 */
export class RefreshTokenDto {
  /**
   * Refresh token
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  refreshToken!: string;
}

/**
 * Multi-factor authentication DTO
 */
export class MfaDto {
  /**
   * MFA verification code
   * @example "123456"
   */
  mfaCode!: string;
}

/**
 * MFA setup DTO
 */
export class MfaSetupDto {
  /**
   * Whether to enable MFA
   * @example true
   */
  enable!: boolean;
}

/**
 * Authentication response interface
 */
export interface AuthResponse {
  /**
   * JWT access token
   */
  accessToken?: string;
  
  /**
   * JWT refresh token
   */
  refreshToken?: string;
  
  /**
   * User information
   */
  user?: Partial<User>;
  
  /**
   * Indicates if MFA is required to complete authentication
   */
  requiresMfa?: boolean;
}

/**
 * MFA setup response
 */
export interface MfaSetupResponse {
  /**
   * Secret key for TOTP
   */
  secret: string;
  
  /**
   * QR code data URL
   */
  qrCodeUrl: string;
}

/**
 * Refresh token data stored in database
 */
export interface RefreshTokenData {
  /**
   * User identifier
   */
  userId: string;
  
  /**
   * User email
   */
  email: string;
  
  /**
   * Tenant identifier
   */
  tenantId: string;
  
  /**
   * User roles
   */
  roles: string[];
  
  /**
   * Token expiration timestamp
   */
  expiresAt: number;
}

/**
 * LDAP login DTO interface for LDAP/AD authentication
 */
export class LdapLoginDto {
  /**
   * User email or username for LDAP authentication
   * @example "john.doe@example.com"
   */
  email!: string;
  
  /**
   * User password for LDAP authentication
   * @example "SecurePassword123"
   */
  password!: string;
  
  /**
   * Multi-factor authentication code (optional)
   * @example "123456"
   */
  mfaCode?: string;
} 