import { MikroOrmModuleOptions } from '@mikro-orm/nestjs';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';

/**
 * Test database configuration using SQLite in-memory database
 */
export const testDbConfig: MikroOrmModuleOptions = {
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],
  // Dynamic configuration for SQLite without explicit driver import
  // Configuration is loaded at runtime
  clientUrl: 'sqlite::memory:',
  dbName: ':memory:',
  metadataProvider: TsMorphMetadataProvider,
  debug: false,
  registerRequestContext: false,
  allowGlobalContext: true,
}; 