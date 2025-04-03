# Testcontainers Integration for NestJS Tests

This directory contains utilities for setting up integration tests with real infrastructure dependencies using Testcontainers.

## Overview

Testcontainers allow us to programmatically create and control Docker containers from our test code, providing:

- Realistic testing with real infrastructure (PostgreSQL, Redis)
- Complete isolation between test runs
- Reproducible test environments
- Automatic cleanup of resources

## Available Containers

### PostgreSQL Container

The `PostgresTestContainer` class provides a managed PostgreSQL container integrated with NestJS Testing module and MikroORM.

```typescript
import { PostgresTestContainer } from '../utils/containers';
import { User, Role, Permission } from '../../src/users/entities';
import { UserRepository } from '../../src/users/repositories/user.repository';

describe('PostgreSQL Container Test', () => {
  let container: PostgresTestContainer;
  let userRepository: UserRepository;

  beforeAll(async () => {
    container = new PostgresTestContainer({
      entities: [User, Role, Permission],
      providers: [UserRepository],
    });
    
    const moduleRef = await container.start();
    userRepository = moduleRef.get<UserRepository>(UserRepository);
  });

  afterAll(async () => {
    await container.stop();
  });

  // Your tests...
});
```

### Redis Container

The `RedisTestContainer` class provides a managed Redis container with an integrated Redis client and a simple cache service implementation.

```typescript
import { RedisTestContainer } from '../utils/containers';

describe('Redis Container Test', () => {
  let container: RedisTestContainer;
  let redisClient;
  let cacheService;

  beforeAll(async () => {
    container = new RedisTestContainer({
      registerCacheService: true, // Default is true
    });
    
    const moduleRef = await container.start();
    
    // Get Redis client and cache service
    redisClient = container.getRedisClient();
    cacheService = container.getCacheService();
  });

  afterAll(async () => {
    await container.stop();
  });

  it('should store and retrieve data', async () => {
    // Set a value
    await cacheService.set('test-key', 'test-value');
    
    // Get the value
    const value = await cacheService.get('test-key');
    expect(value).toBe('test-value');
  });
});

### Multi-Tenant Test Environment

The `MultiTenantTestEnvironment` class provides a combined environment with both PostgreSQL and Redis containers, with tenant context support.

```typescript
import { MultiTenantTestEnvironment } from '../utils/containers';
import { User, Role, Permission } from '../../src/users/entities';
import { UserRepository } from '../../src/users/repositories/user.repository';

describe('Multi-Tenant Test', () => {
  let env: MultiTenantTestEnvironment;
  let userRepository: UserRepository;

  beforeAll(async () => {
    env = new MultiTenantTestEnvironment({
      postgres: {
        entities: [User, Role, Permission],
      },
      redis: {
        // Redis options (optional)
      },
      providers: [UserRepository],
      defaultTenantId: 'test-tenant',
    });
    
    const moduleRef = await env.start();
    userRepository = moduleRef.get(UserRepository);
  });

  afterAll(async () => {
    await env.stop();
  });
  
  beforeEach(async () => {
    // Clear state between tests
    await env.clearDatabase();
    await env.clearCache();
    
    // Set tenant ID for tests
    env.setTenantId('test-tenant');
  });

  // Your tests...
});
```

## Best Practices

1. **Container Lifecycle**:
   - Start containers in `beforeAll`
   - Stop containers in `afterAll`
   - Clear state in `beforeEach` when needed

2. **Resource Management**:
   - Always call `stop()` to clean up containers
   - Use `clearDatabase()` and `clearCache()` to reset state between tests

3. **Performance Optimization**:
   - Reuse containers across multiple tests in a suite
   - Only reset the state you need between tests

4. **Tenant Isolation**:
   - Use `setTenantId()` to switch between tenants in tests
   - Verify tenant isolation by testing cross-tenant access

## Troubleshooting

If tests fail with Docker-related errors:

1. Verify Docker is running on your machine
2. Check if there are port conflicts
3. Increase timeout values if container startup is slow
4. Check if test cleanup is properly stopping containers

For port conflicts, containers use random ports by default, but you can use fixed ports:

```typescript
const container = new PostgreSqlContainer()
  .withExposedPorts({ container: 5432, host: 5433 })
  .start();
```
