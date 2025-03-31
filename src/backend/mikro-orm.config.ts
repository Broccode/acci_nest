import { defineConfig } from '@mikro-orm/core';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';
import { LoadStrategy } from '@mikro-orm/core';
import configuration from './src/config/configuration';

// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

const config = configuration();

export default defineConfig({
  driver: require('@mikro-orm/postgresql').PostgreSqlDriver,
  host: config.database.host,
  port: config.database.port,
  user: config.database.username,
  password: config.database.password,
  dbName: config.database.name,
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  debug: config.environment === 'development',
  loadStrategy: LoadStrategy.JOINED,
  highlighter: new SqlHighlighter(),
  
  // Optimized connection pool settings
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 20000,
  },
  
  // Optimized query cache
  resultCache: {
    expiration: 1000 * 60 * 60, // 1 hour
    global: config.environment === 'production',
  },
  
  // Retry configuration for improved resilience
  driverOptions: {
    connection: {
      ssl: false,
      application_name: 'acci_nest',
      max_retries: 5,
      retry_interval: 1000, // 1 second between retries
    },
  },
  
  migrations: {
    tableName: 'mikro_orm_migrations',
    path: './migrations',
    glob: '!(*.d).{js,ts}',
    transactional: true,
    allOrNothing: true,
    dropTables: false,
    safe: true,
  },
  
  seeder: {
    path: './seeders',
    defaultSeeder: 'DatabaseSeeder',
    glob: '!(*.d).{js,ts}',
    emit: 'ts',
  },
  
  allowGlobalContext: true,
  tsNode: true, // Enable when running via ts-node or compiling
  discovery: {
    warnWhenNoEntities: false, // disable warnings when no entities were discovered
  },
}); 