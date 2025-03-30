export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  
  environment: process.env.BUN_ENV || process.env.NODE_ENV || 'development',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret',
    expiresIn: parseInt(process.env.JWT_EXPIRES_IN || '3600', 10),
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
}); 