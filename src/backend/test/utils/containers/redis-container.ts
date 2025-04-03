import { DynamicModule, ForwardReference, Provider, Type } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { Redis } from 'ioredis';

// Define interfaces for our cache service to avoid direct imports
interface RedisCacheService {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
}

// Define constant to be used
const REDIS_CLIENT = 'REDIS_CLIENT';

/**
 * Connection details for the Redis container
 */
export interface RedisConnectionDetails {
  /** Redis hostname */
  host: string;
  /** Redis port number */
  port: number;
}

/**
 * Options for configuring the Redis test container
 */
export interface RedisContainerOptions {
  /** Redis version to use (default: 'redis:7-alpine') */
  image?: string;
  /** Additional providers to register in the testing module */
  providers?: Provider[];
  /** Additional imports to include in the testing module */
  imports?: (Type<unknown> | DynamicModule | Promise<DynamicModule> | ForwardReference<unknown>)[];
  /** Whether to register the Redis cache service (default: true) */
  registerCacheService?: boolean;
}

/**
 * Helper class for setting up a Redis container for integration tests
 *
 * @example
 * ```typescript
 * // Create and start a Redis container
 * const redisContainer = new RedisTestContainer();
 * const moduleRef = await redisContainer.start();
 *
 * // Get the cache service
 * const cacheService = moduleRef.get(RedisCacheService);
 *
 * // Use Redis in tests...
 *
 * // After tests are complete
 * await redisContainer.stop();
 * ```
 */
export class RedisTestContainer {
  private container: StartedRedisContainer | null = null;
  private connectionDetails: RedisConnectionDetails | null = null;
  private moduleRef: TestingModule | null = null;
  private redisClient: Redis | null = null;

  private readonly options: Required<RedisContainerOptions>;

  constructor(options: RedisContainerOptions = {}) {
    this.options = {
      image: 'redis:7-alpine',
      providers: [],
      imports: [],
      registerCacheService: true,
      ...options,
    };
  }

  /**
   * Start the Redis container and create a testing module with Redis configured
   */
  async start(): Promise<TestingModule> {
    // Retry logic for container start
    const maxRetries = 3;
    let retries = 0;
    let lastError: Error | null = null;

    while (retries < maxRetries) {
      try {
        // Start Redis container using the specialized RedisContainer
        const redisContainer = new RedisContainer(this.options.image);
        this.container = await redisContainer.start();

        // Store connection details
        this.connectionDetails = {
          host: this.container.getHost(),
          port: this.container.getPort(),
        };

        // Create Redis client
        const redisClient = new Redis({
          host: this.connectionDetails.host,
          port: this.connectionDetails.port,
        });

        // Create testing module
        this.moduleRef = await Test.createTestingModule({
          imports: [...this.options.imports],
          providers: [
            {
              provide: REDIS_CLIENT,
              useValue: redisClient,
            },
            ...(this.options.providers || []),
          ],
        }).compile();

        // Store Redis client
        this.redisClient = redisClient;

        return this.moduleRef;
      } catch (error) {
        lastError = error as Error;
        console.error(
          `Failed to start Redis container (attempt ${retries + 1}/${maxRetries}):`,
          error
        );

        // Clean up any resources that might have been created
        if (this.container) {
          try {
            await this.container.stop();
          } catch (stopError) {
            // Ignore errors when stopping container
          }
          this.container = null;
        }

        if (this.redisClient) {
          try {
            await this.redisClient.quit();
          } catch (quitError) {
            // Ignore errors when quitting Redis client
          }
          this.redisClient = null;
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
        await new Promise((resolve) => setTimeout(resolve, 1000 * (retries + 1)));
        retries++;
      }
    }

    // If we've exhausted all retries, throw the last error
    throw new Error(
      `Failed to start Redis container after ${maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Get connection details for the Redis container
   */
  getConnectionDetails(): RedisConnectionDetails {
    if (!this.connectionDetails) {
      throw new Error('Container not started');
    }
    return this.connectionDetails;
  }

  /**
   * Get the Redis client connected to the container
   */
  getRedisClient(): Redis {
    if (!this.redisClient) {
      throw new Error('Container not started');
    }
    return this.redisClient;
  }

  /**
   * Get the cache service from the module
   */
  getCacheService(): RedisCacheService {
    if (!this.moduleRef) {
      throw new Error('Module not created');
    }
    return this.moduleRef.get('RedisCacheService');
  }

  /**
   * Stop the Redis container and clean up resources
   */
  async stop(): Promise<void> {
    if (this.redisClient) {
      try {
        // First disconnect call, then quit
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

    if (this.moduleRef) {
      try {
        await this.moduleRef.close();
      } catch (error) {
        console.error('Error closing testing module:', error);
      } finally {
        this.moduleRef = null;
      }
    }

    if (this.container) {
      try {
        await this.container.stop();
      } catch (error) {
        console.error('Error stopping Redis container:', error);
      } finally {
        this.container = null;
        this.connectionDetails = null;
      }
    }

    // Use timer unref to prevent the process from being blocked
    setTimeout(() => {
      // This timer helps Node.js recognize that the event loop should be empty
    }, 1000).unref();
  }
}
