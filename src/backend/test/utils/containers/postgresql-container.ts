import { EntityManager, MikroORM } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver, SchemaGenerator } from '@mikro-orm/postgresql';
import { DynamicModule } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { v4 as uuidv4 } from 'uuid';

/**
 * Connection details for the PostgreSQL container
 */
export interface PostgresConnectionDetails {
  /** PostgreSQL host */
  host: string;
  /** PostgreSQL port */
  port: number;
  /** Database name */
  database: string;
  /** Username */
  username: string;
  /** Password */
  password: string;
}

/**
 * Options for configuring the PostgreSQL test container
 */
export interface PostgresContainerOptions {
  /** PostgreSQL version to use (default: 'postgres:14-alpine') */
  image?: string;
  /** Database name (default: 'test') */
  database?: string;
  /** Username (default: 'postgres') */
  username?: string;
  /** Password (default: 'postgres') */
  password?: string;
  /** Entities to register in MikroORM */
  entities: any[];
  /** Additional providers to register in the testing module */
  providers?: any[];
  /** Additional imports to include in the testing module */
  imports?: any[];
  /** Set to true to generate schema on start (default: true) */
  generateSchema?: boolean;
}

/**
 * Helper class for setting up a PostgreSQL container for integration tests
 * 
 * @example
 * ```typescript
 * // Create and start a PostgreSQL container
 * const postgresContainer = new PostgresTestContainer({
 *   entities: [User, Role, Permission],
 * });
 * const moduleRef = await postgresContainer.start();
 * 
 * // Get the entity manager
 * const em = postgresContainer.getEntityManager();
 * 
 * // Use PostgreSQL in tests...
 * 
 * // After tests are complete
 * await postgresContainer.stop();
 * ```
 */
export class PostgresTestContainer {
  private container: StartedPostgreSqlContainer | null = null;
  private connectionDetails: PostgresConnectionDetails | null = null;
  private moduleRef: TestingModule | null = null;
  private entityManager: EntityManager | null = null;
  private schemaGenerator: SchemaGenerator | null = null;
  private orm: MikroORM | null = null;
  
  private readonly options: Required<PostgresContainerOptions>;
  
  constructor(options: PostgresContainerOptions) {
    // Validate required options
    if (!options.entities || !Array.isArray(options.entities)) {
      throw new Error('entities option is required and must be an array');
    }
    
    this.options = {
      image: 'postgres:14-alpine',
      database: 'test',
      username: 'postgres',
      password: 'postgres',
      generateSchema: true,
      providers: [],
      imports: [],
      ...options,
    };
  }
  
  /**
   * Start the PostgreSQL container and create a testing module with MikroORM configured
   */
  async start(): Promise<TestingModule> {
    // Retry logic for container start
    const maxRetries = 3;
    let retries = 0;
    let lastError: Error | null = null;
    
    while (retries < maxRetries) {
      try {
        // Start PostgreSQL container using PostgreSqlContainer
        const postgresContainer = new PostgreSqlContainer(this.options.image)
          .withDatabase(this.options.database)
          .withUsername(this.options.username)
          .withPassword(this.options.password);
          
        this.container = await postgresContainer.start();
          
        // Store connection details
        this.connectionDetails = {
          host: this.container.getHost(),
          port: this.container.getPort(),
          database: this.options.database,
          username: this.options.username,
          password: this.options.password,
        };
        
        // Create MikroORM configuration
        const ormConfig = {
          entities: this.options.entities,
          dbName: this.connectionDetails.database,
          host: this.connectionDetails.host,
          port: this.connectionDetails.port,
          user: this.connectionDetails.username,
          password: this.connectionDetails.password,
          driver: PostgreSqlDriver,
          debug: false,
          allowGlobalContext: true,
          registerRequestContext: false,
          ensureDatabase: true,
          autoLoadEntities: true,
          discovery: {
            warnWhenNoEntities: false,
          },
        };
        
        // Manually initialize MikroORM
        this.orm = await MikroORM.init(ormConfig);
        
        // Get entity manager from the ORM instance
        this.entityManager = this.orm.em.fork();
        
        // Create schema generator
        this.schemaGenerator = new SchemaGenerator(this.entityManager);
        
        // Generate database schema if needed
        if (this.options.generateSchema) {
          await this.createSchema();
        }
        
        // Create test tenants if Tenant entity is included
        await this.createTestTenants();
        
        // Create testing module with MikroORM instance provided
        this.moduleRef = await Test.createTestingModule({
          imports: [
            ...this.options.imports,
          ],
          providers: [
            // Provide MikroORM instance
            {
              provide: 'MikroORM',
              useValue: this.orm,
            },
            // Provide EntityManager
            {
              provide: EntityManager,
              useValue: this.entityManager,
            },
            ...this.options.providers,
          ],
        }).compile();
        
        return this.moduleRef;
      } catch (error) {
        lastError = error as Error;
        console.error(`Failed to start PostgreSQL container (attempt ${retries + 1}/${maxRetries}):`, error);
        
        // Clean up any resources that might have been created
        if (this.container) {
          try {
            await this.container.stop();
          } catch (stopError) {
            // Ignore errors when stopping container
          }
          this.container = null;
        }
        
        if (this.orm) {
          try {
            await this.orm.close(true);
          } catch (closeError) {
            // Ignore errors when closing ORM
          }
          this.orm = null;
        }
        
        if (this.moduleRef) {
          try {
            await this.moduleRef.close();
          } catch (closeError) {
            // Ignore errors when closing module
          }
          this.moduleRef = null;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
        retries++;
      }
    }
    
    // If we've exhausted all retries, throw the last error
    throw new Error(`Failed to start PostgreSQL container after ${maxRetries} attempts: ${lastError?.message}`);
  }
  
  /**
   * Create test tenants for testing tenant-aware entities
   */
  private async createTestTenants(): Promise<void> {
    if (!this.entityManager) {
      throw new Error('Entity manager not initialized');
    }
    
    try {
      // Check if Tenant entity exists in the registered entities
      const tenantEntityClass = this.options.entities.find(entity => 
        entity.name === 'Tenant' || 
        (typeof entity === 'function' && entity.prototype?.constructor?.name === 'Tenant')
      );
      
      if (tenantEntityClass) {
        console.log('Creating test tenants...');
        
        // Verify schema
        const connection = this.entityManager.getConnection();
        const tables = await connection.execute('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'');
        console.log('Available tables:', tables);
        
        // Try to directly create the tenants with direct SQL
        const tenant1Id = uuidv4();
        const tenant2Id = uuidv4();
        
        try {
          // Check if the tenants table has the expected structure
          const columns = await connection.execute('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'tenants\'');
          console.log('Tenants table columns:', columns);
          
          // Create tenants with direct SQL
          await connection.execute(`
            INSERT INTO tenants (id, name, domain, status, created_at, updated_at) 
            VALUES 
              ('${tenant1Id}', 'Test Tenant 1', 'test1.example.com', 'active', NOW(), NOW()),
              ('${tenant2Id}', 'Test Tenant 2', 'test2.example.com', 'active', NOW(), NOW())
            ON CONFLICT (name) DO NOTHING
          `);
          
          console.log(`Created tenants via SQL with IDs: ${tenant1Id}, ${tenant2Id}`);
          
          // Store tenant IDs for tests to access
          (this as any).testTenantIds = {
            tenant1: tenant1Id,
            tenant2: tenant2Id
          };
          
          // Verify tenants were created
          const createdTenants = await connection.execute('SELECT * FROM tenants');
          console.log('Created tenants:', createdTenants);
        } catch (sqlError) {
          console.error('SQL Error:', sqlError);
        }
      } else {
        console.log('Tenant entity not found in registered entities');
        console.log('Registered entities:', this.options.entities.map(e => typeof e === 'function' ? e.name : e));
      }
    } catch (error) {
      console.warn('Error creating test tenants:', error);
      // Continue execution even if tenant creation fails
    }
  }
  
  /**
   * Get test tenant IDs
   */
  getTestTenantIds(): { tenant1: string, tenant2: string } | null {
    return (this as any).testTenantIds || null;
  }
  
  /**
   * Create a MikroORM module connected to the PostgreSQL container
   */
  private createMikroOrmModule(): DynamicModule {
    if (!this.connectionDetails) {
      throw new Error('Container not started');
    }
    
    const config = {
      entities: this.options.entities,
      dbName: this.connectionDetails.database,
      host: this.connectionDetails.host,
      port: this.connectionDetails.port,
      user: this.connectionDetails.username,
      password: this.connectionDetails.password,
      driver: PostgreSqlDriver,
      debug: false,
      allowGlobalContext: true,
      registerRequestContext: false,
      ensureDatabase: true,
      autoLoadEntities: true,
      discovery: {
        warnWhenNoEntities: false,
      },
    };
    
    return MikroOrmModule.forRoot(config) as DynamicModule;
  }
  
  /**
   * Create the database schema using MikroORM's schema generator
   */
  async createSchema(): Promise<void> {
    if (!this.schemaGenerator) {
      throw new Error('Container not started');
    }
    
    const connection = this.entityManager?.getConnection();
    
    // Drop all tables
    const dropDDL = await this.schemaGenerator.getDropSchemaSQL();
    if (dropDDL) {
      await connection?.execute(dropDDL);
    }
    
    // Create tables
    const createDDL = await this.schemaGenerator.getCreateSchemaSQL();
    if (createDDL) {
      await connection?.execute(createDDL);
    }
  }
  
  /**
   * Get the entity manager from MikroORM
   */
  getEntityManager(): EntityManager {
    if (!this.entityManager) {
      throw new Error('Container not started');
    }
    return this.entityManager;
  }
  
  /**
   * Get the MikroORM instance
   */
  getMikroORM(): MikroORM {
    if (!this.orm) {
      throw new Error('Container not started');
    }
    return this.orm;
  }
  
  /**
   * Get the schema generator for creating/dropping schemas
   */
  getSchemaGenerator(): SchemaGenerator {
    if (!this.schemaGenerator) {
      throw new Error('Container not started');
    }
    return this.schemaGenerator;
  }
  
  /**
   * Get connection details for the PostgreSQL container
   */
  getConnectionDetails(): PostgresConnectionDetails {
    if (!this.connectionDetails) {
      throw new Error('Container not started');
    }
    return this.connectionDetails;
  }
  
  /**
   * Stop the PostgreSQL container and clean up resources
   */
  async stop(): Promise<void> {
    if (this.moduleRef) {
      await this.moduleRef.close();
      this.moduleRef = null;
    }
    
    if (this.container) {
      await this.container.stop();
      this.container = null;
      this.connectionDetails = null;
      this.entityManager = null;
      this.schemaGenerator = null;
      this.orm = null;
    }
  }
} 