export default () => ({
  port: parseInt(process.env.BACKEND_PORT || '3100', 10),

  environment: process.env.BUN_ENV || process.env.NODE_ENV || 'development',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret',
    expiresIn: parseInt(process.env.JWT_EXPIRES_IN || '3600', 10),
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret',
    jwtExpiresIn: parseInt(process.env.JWT_EXPIRES_IN || '900', 10), // 15 minutes
    refreshTokenExpiresIn: parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN || '604800', 10), // 7 days
    passwordResetTokenExpiresIn: parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN || '3600', 10), // 1 hour
    mfaTokenLength: 6,
    passwordMinLength: 8,
    maxLoginAttempts: 5,
    lockoutTime: 15 * 60, // 15 minutes in seconds
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackUrl: process.env.GITHUB_CALLBACK_URL,
    },
  },

  ldap: {
    url: process.env.LDAP_URL || 'ldap://ldap.example.com:389',
    bindDN: process.env.LDAP_BIND_DN || 'cn=admin,dc=example,dc=com',
    bindCredentials: process.env.LDAP_BIND_CREDENTIALS || 'admin_password',
    searchBase: process.env.LDAP_SEARCH_BASE || 'ou=users,dc=example,dc=com',
    searchFilter: process.env.LDAP_SEARCH_FILTER || '(mail={{username}})',
    tlsOptions: {
      rejectUnauthorized: process.env.LDAP_REJECT_UNAUTHORIZED !== 'false',
    },
    defaultTenantId: process.env.LDAP_DEFAULT_TENANT_ID || 'default',
    defaultTenantName: process.env.LDAP_DEFAULT_TENANT_NAME || 'ldap',
    defaultTenantDomain: process.env.LDAP_DEFAULT_TENANT_DOMAIN || 'ldap.domain',
    useTLS: process.env.LDAP_USE_TLS === 'true',
  },

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'acci_user',
    password: process.env.DB_PASSWORD || 'acci_password',
    name: process.env.DB_NAME || 'acci_nest',
    synchronize: (process.env.BUN_ENV || process.env.NODE_ENV) !== 'production',
    logging: (process.env.BUN_ENV || process.env.NODE_ENV) === 'development',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
    connectionTimeout: parseInt(process.env.REDIS_CONNECTION_TIMEOUT || '10000', 10),
    commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000', 10),
    retryAttempts: parseInt(process.env.REDIS_RETRY_ATTEMPTS || '5', 10),
    retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'acci:',
    ttl: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10), // Default 1 hour
    maxConnections: parseInt(process.env.REDIS_MAX_CONNECTIONS || '20', 10),
  },

  cors: {
    enabled: true,
    origin: process.env.CORS_ORIGIN || '*',
  },

  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    title: 'ACCI Nest API',
    description: 'The ACCI Nest API documentation',
    version: '1.0',
    path: 'api/docs',
  },

  app: {
    name: process.env.APP_NAME || 'ACCI Nest',
  },
});
