import { defineConfig } from '@mikro-orm/sqlite';

/**
 * Creates a standard SQLite in-memory database configuration for tests.
 * This ensures consistent database setup across all test files.
 */
export const createTestDbConfig = () => {
  return defineConfig({
    entities: ['./dist/**/*.entity.js'],
    entitiesTs: ['./src/**/*.entity.ts'],
    clientUrl: 'sqlite::memory:',
    dbName: ':memory:',
    debug: false,
    allowGlobalContext: true,
  });
}; 