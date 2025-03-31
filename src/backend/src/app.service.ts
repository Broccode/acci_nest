import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly em: EntityManager) {}

  getHello(): string {
    return 'Hello World!';
  }

  /**
   * Check basic database connectivity
   */
  async checkDbConnection(): Promise<boolean> {
    try {
      await this.em.getConnection().execute('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('Database connection failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * Get comprehensive database health information
   */
  async getDatabaseHealth(): Promise<{
    connected: boolean;
    version: string;
    migrationStatus: { pending: number; applied: number };
    connectionPool: { used: number; size: number; waiting: number };
    stats: { tables: number; sequences: number; schemas: number };
  }> {
    const defaultResponse = {
      connected: false,
      version: 'Unknown',
      migrationStatus: { pending: 0, applied: 0 },
      connectionPool: { used: 0, size: 0, waiting: 0 },
      stats: { tables: 0, sequences: 0, schemas: 0 },
    };

    try {
      // Check basic connectivity
      const connected = await this.checkDbConnection();
      
      if (!connected) {
        this.logger.warn('Database connection check failed during health check');
        return defaultResponse;
      }
      
      try {
        // Fetch PostgreSQL version
        const versionResult = await this.em.getConnection().execute('SELECT version()');
        const version = versionResult[0]?.version || 'Unknown';
        
        // Get migration status
        const migrationsTable = 'mikro_orm_migrations';
        let pending = 0;
        let applied = 0;
        
        try {
          const migrationsResult = await this.em.getConnection().execute(
            `SELECT COUNT(*) as count FROM ${migrationsTable}`
          );
          applied = parseInt(migrationsResult[0]?.count || '0', 10);
          
          // In a real app, we would check pending migrations
          // This would require access to the MikroORM Migrator
        } catch (e) {
          // Migrations table might not exist yet
          this.logger.warn(`Could not fetch migration data: ${e instanceof Error ? e.message : String(e)}`);
        }
        
        // Get connection pool stats - Use a simplified approach with defaults
        // as the internal pool structure can vary between drivers
        const connectionPool = {
          used: 0,
          size: 10, // This matches our configuration
          waiting: 0,
        };
        
        // Get table and schema statistics
        const statsQuery = `
          SELECT 
            (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema')) as tables,
            (SELECT COUNT(*) FROM information_schema.sequences WHERE sequence_schema NOT IN ('pg_catalog', 'information_schema')) as sequences,
            (SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema')) as schemas
        `;
        
        const statsResult = await this.em.getConnection().execute(statsQuery);
        const stats = statsResult[0] || { tables: 0, sequences: 0, schemas: 0 };
        
        return {
          connected,
          version: version.split(' ')[0] || version,
          migrationStatus: { pending, applied },
          connectionPool,
          stats: {
            tables: parseInt(stats.tables, 10),
            sequences: parseInt(stats.sequences, 10),
            schemas: parseInt(stats.schemas, 10),
          },
        };
      } catch (error) {
        this.logger.error('Error retrieving database details during health check', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        return {
          ...defaultResponse,
          connected, // We know the connection succeeded even if the details failed
        };
      }
    } catch (error) {
      this.logger.error('Failed to retrieve database health', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return defaultResponse;
    }
  }
} 