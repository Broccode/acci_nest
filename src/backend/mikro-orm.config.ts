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
  migrations: {
    tableName: 'mikro_orm_migrations',
    path: './migrations',
    glob: '!(*.d).{js,ts}',
  },
  seeder: {
    path: './seeders',
    defaultSeeder: 'DatabaseSeeder',
    glob: '!(*.d).{js,ts}',
  },
  allowGlobalContext: true,
  tsNode: true, // Enable when running via ts-node or compiling
  discovery: {
    warnWhenNoEntities: false, // disable warnings when no entities were discovered
  },
}); 