import { EntityManager, MikroORM } from '@mikro-orm/core';
import { DynamicModule, ForwardReference, Provider, Type } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { RedisCacheService } from '../../../src/common/cache/redis-cache.service';
import { TENANT_CONTEXT } from '../../../src/common/constants';
import { REDIS_CLIENT } from '../../../src/common/constants';
import { TenantContext } from '../../../src/tenants/services/tenant-context.service';
import { PostgresContainerOptions, PostgresTestContainer } from './postgresql-container';
import { RedisContainerOptions, RedisTestContainer } from './redis-container';

/**
 * Configuration options for the multi-tenant test environment
 */
export interface MultiTenantTestEnvironmentOptions {
  /**
   * PostgreSQL container options
   */
  postgres: Omit<PostgresContainerOptions, 'providers' | 'imports'>;

  /**
   * Redis container options
   */
  redis?: Omit<RedisContainerOptions, 'providers' | 'imports'>;

  /**
   * Additional providers to register in the testing module
   */
  providers?: Provider[];

  /**
   * Additional imports to include in the testing module
   */
  imports?: (Type<unknown> | DynamicModule | Promise<DynamicModule> | ForwardReference<unknown>)[];

  /**
   * Default tenant ID to use for tests
   */
  defaultTenantId?: string;
}

/**
 * Helper class for setting up a complete multi-tenant test environment
 * with both PostgreSQL and Redis containers
 */
export class MultiTenantTestEnvironment {
  public postgresContainer: PostgresTestContainer | null = null;
  private redisContainer: RedisTestContainer | null = null;
  private moduleRef: TestingModule | null = null;
  private mockTenantContext: Partial<TenantContext> = {};
  private redisClient: Redis | null = null;
  private mikroOrm: MikroORM | null = null;
  private entityManager: EntityManager | null = null;

  private readonly options: MultiTenantTestEnvironmentOptions & {
    defaultTenantId: string;
  };

  constructor(options: MultiTenantTestEnvironmentOptions) {
    this.options = {
      defaultTenantId: options.defaultTenantId || uuidv4(),
      ...options,
    };

    // Create mock tenant context
    this.mockTenantContext = {
      getCurrentTenant: jest.fn().mockReturnValue(this.options.defaultTenantId),
      getCurrentTenantOrDefault: jest.fn().mockReturnValue(this.options.defaultTenantId),
      hasTenant: jest.fn().mockReturnValue(true),
      setCurrentTenant: jest.fn(),
      clearCurrentTenant: jest.fn(),
    };
  }

  /**
   * Getter for the Redis client
   * @returns The current Redis client or null if not initialized
   */
  getRedisClient(): Redis | null {
    return this.redisClient;
  }

  /**
   * Getter for the MikroORM instance
   * @returns The current MikroORM instance or null if not initialized
   */
  getMikroOrmInstance(): MikroORM | null {
    return this.mikroOrm;
  }

  /**
   * Start both containers and create a testing module
   */
  async start(): Promise<TestingModule> {
    // Start PostgreSQL container
    this.postgresContainer = new PostgresTestContainer({
      ...this.options.postgres,
      providers: [],
      imports: [],
    });

    const postgresModule = await this.postgresContainer.start();
    this.mikroOrm = this.postgresContainer.getMikroORM();
    this.entityManager = this.postgresContainer.getEntityManager();

    // Start Redis container if enabled
    if (this.options.redis) {
      this.redisContainer = new RedisTestContainer({
        ...this.options.redis,
        providers: [],
        imports: [],
      });

      await this.redisContainer.start();

      // Get Redis client from the container
      this.redisClient = this.redisContainer.getRedisClient();
    }

    // Initialize repository providers
    const repositoryProviders = this.initializeRepositoryProviders();

    // Create combined module with both containers
    this.moduleRef = await Test.createTestingModule({
      imports: [...(this.options.imports || [])],
      providers: [
        // Mock tenant context
        {
          provide: TENANT_CONTEXT,
          useValue: this.mockTenantContext,
        },
        // MikroORM related providers
        {
          provide: 'MikroORM',
          useValue: this.mikroOrm,
        },
        {
          provide: EntityManager,
          useFactory: () => this.entityManager,
        },
        // Redis client if available
        ...(this.redisClient
          ? [
              {
                provide: REDIS_CLIENT,
                useValue: this.redisClient,
              },
              RedisCacheService,
            ]
          : []),
        // Include repository providers
        ...repositoryProviders,
        ...(this.options.providers || []),
      ],
    }).compile();

    return this.moduleRef;
  }

  /**
   * Initialize repository providers from the options.providers list
   * to ensure they are properly configured with the EntityManager
   */
  private initializeRepositoryProviders(): Provider[] {
    if (!this.options.providers || !this.entityManager || !this.mikroOrm) {
      return [];
    }

    const repositoryProviders: Provider[] = [];

    // Find all repository classes in the providers list
    for (const provider of this.options.providers) {
      if (
        typeof provider === 'function' &&
        (provider.name.includes('Repository') ||
          provider.prototype?.constructor?.name.includes('Repository'))
      ) {
        // Register the repository with proper factory initialization
        repositoryProviders.push({
          provide: provider,
          useFactory: () => {
            // Use the MikroORM internal methods to create properly initialized repositories
            const entityName = this.findEntityNameForRepository(provider.name);
            if (entityName) {
              return this.entityManager.getRepository(entityName);
            }

            // Fallback to direct instantiation if entity name cannot be determined
            const repo = new provider();
            repo.em = this.entityManager;
            return repo;
          },
        });
      }
    }

    return repositoryProviders;
  }

  /**
   * Find the entity name based on repository name
   */
  private findEntityNameForRepository(repositoryName: string): string | null {
    // Extract entity name from repository name (e.g., "UserRepository" -> "User")
    const entityName = repositoryName.replace('Repository', '');

    // Find the matching entity class in the registered entities
    const entityClass = this.options.postgres.entities.find((entity) => {
      const name = typeof entity === 'function' ? entity.name : entity.constructor?.name;
      return name === entityName;
    });

    return entityClass
      ? typeof entityClass === 'function'
        ? entityClass.name
        : entityClass.constructor?.name
      : null;
  }

  /**
   * Get a service or repository from the testing module
   */
  get<T>(typeOrToken: Type<T> | string | symbol): T {
    if (!this.moduleRef) {
      throw new Error('Environment not started. Call start() before accessing services.');
    }
    return this.moduleRef.get<T>(typeOrToken);
  }

  /**
   * Get the mock tenant context to adjust tenant behavior during tests
   */
  getTenantContext(): Partial<TenantContext> {
    return this.mockTenantContext;
  }

  /**
   * Set the current tenant ID for test scenarios
   */
  setTenantId(tenantId: string): void {
    (this.mockTenantContext.getCurrentTenant as jest.Mock).mockReturnValue(tenantId);
    (this.mockTenantContext.getCurrentTenantOrDefault as jest.Mock).mockReturnValue(tenantId);
  }

  /**
   * Clear database between tests (useful in beforeEach)
   */
  async clearDatabase(): Promise<void> {
    if (!this.postgresContainer) {
      throw new Error('PostgreSQL container not started');
    }

    const em = this.postgresContainer.getEntityManager();

    // Only clear the entity manager without flushing
    // This prevents validation errors for unsaved entities
    em.clear();
  }

  /**
   * Clear Redis cache between tests (useful in beforeEach)
   */
  async clearCache(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.flushdb();
    }
  }

  /**
   * Stop all containers and close the testing module
   */
  async stop(): Promise<void> {
    try {
      // First clear all resources
      this.entityManager?.clear();

      // Properly close Redis client
      if (this.redisClient) {
        try {
          // First call disconnect, then quit
          await this.redisClient.disconnect();

          // Short pause to allow the connection to close
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Then try to quit
          await this.redisClient.quit();

          // Explicitly remove all remaining listeners
          this.redisClient.removeAllListeners();
        } catch (error) {
          console.error('Error closing Redis client:', error);
        } finally {
          this.redisClient = null;
        }
      }

      // Close testing module
      if (this.moduleRef) {
        try {
          await this.moduleRef.close();
        } catch (error) {
          console.error('Error closing testing module:', error);
        } finally {
          this.moduleRef = null;
        }
      }

      // Stop Redis container
      if (this.redisContainer) {
        try {
          await this.redisContainer.stop();
        } catch (error) {
          console.error('Error stopping Redis container:', error);
        } finally {
          this.redisContainer = null;
        }
      }

      // Explicitly close MikroORM
      if (this.mikroOrm) {
        try {
          await this.mikroOrm.close(true);
        } catch (error) {
          console.error('Error closing MikroORM:', error);
        } finally {
          this.mikroOrm = null;
        }
      }

      // Stop PostgreSQL container
      if (this.postgresContainer) {
        try {
          await this.postgresContainer.stop();
        } catch (error) {
          console.error('Error stopping PostgreSQL container:', error);
        } finally {
          this.postgresContainer = null;
          this.entityManager = null;
        }
      }
    } catch (error) {
      console.error('Unexpected error shutting down test environment:', error);
      throw error;
    }

    // We can't directly clean up timers, but we can
    // call unref() on a new timer to ensure the process isn't blocked
    setTimeout(() => {
      // This timer helps Node.js recognize that the event loop should be empty
    }, 1000).unref();
  }

  /**
   * Get a properly initialized repository instance
   *
   * This method solves a critical issue with MikroORM repositories in tests:
   *
   * The problem: When repositories extend from EntityRepository, they need to be properly
   * initialized with an EntityManager. In tests, simply getting a repository via DI sometimes
   * fails to properly set up the internal methods like findOne, find, etc., leading to
   * "Cannot read properties of undefined" errors when those methods are called.
   *
   * This solution:
   * 1. Locates the entity class that corresponds to the repository by name convention
   * 2. Gets a properly initialized repository from the EntityManager for that entity
   * 3. Ensures the repository has access to the EntityManager for its operations
   *
   * Usage example:
   * ```typescript
   * // Instead of this:
   * repository = moduleRef.get<UserRepository>(UserRepository);
   *
   * // Use this:
   * repository = environment.getRepository<User>(UserRepository);
   * ```
   *
   * @param repository The repository class to initialize
   * @returns A properly initialized repository instance
   */
  getRepository<T extends object>(repository: new (...args: any[]) => any): any {
    if (!this.entityManager) {
      throw new Error('Environment not started. Call start() before accessing repositories.');
    }

    // For MikroORM repositories, we need to properly initialize them
    const entityClass = this.findEntityClassForRepository(repository);
    if (entityClass) {
      // Get the actual entity repository from MikroORM
      const mikroRepo = this.entityManager.getRepository(entityClass);

      // Create an instance of our custom repository
      const customRepo = new repository();

      // Assign important EntityRepository methods to our custom repository
      for (const prop of Object.getOwnPropertyNames(Object.getPrototypeOf(mikroRepo))) {
        if (typeof mikroRepo[prop] === 'function' && prop !== 'constructor') {
          customRepo[prop] = mikroRepo[prop].bind(mikroRepo);
        }
      }

      // Set entityName and em
      customRepo.entityName = entityClass.name;
      customRepo.em = this.entityManager;

      return customRepo;
    }

    // Return the repository if it's not an entity repository
    return this.moduleRef?.get(repository);
  }

  /**
   * Find the entity class for a repository by checking entity metadata
   */
  private findEntityClassForRepository(repoClass: new (...args: any[]) => any): any {
    if (!this.mikroOrm) return null;

    const repoName = repoClass.name;
    const entityName = repoName.replace('Repository', '');

    // Find the entity in the metadata
    for (const entity of this.options.postgres.entities) {
      // Check if entity is a class (function) with matching name
      if (typeof entity === 'function' && entity.name === entityName) {
        return entity;
      }
      
      // Check if entity is an object with name property
      if (typeof entity === 'object' && entity !== null && 'name' in entity && entity.name === entityName) {
        return entity;
      }
    }

    return null;
  }
}
