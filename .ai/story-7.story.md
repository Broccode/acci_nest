# Epic-2 - Story-7

Testcontainers Integration for Realistic Integration Tests

**As a** developer
**I want** to implement Testcontainers for integration tests
**So that** we can test our application against real infrastructure dependencies in an isolated, reproducible manner.

## Status

Draft

## Context

- We have established a Testing Strategy in our architecture documentation that highlights the importance of testing with real infrastructure components.
- Currently, our tests primarily rely on mocks and stubs for external dependencies like PostgreSQL and Redis.
- Testcontainers allows us to programmatically create and manage Docker containers from our test code.
- This approach offers more realistic test scenarios while maintaining isolation and reproducibility.
- The implementation aligns with our previously documented testing strategy that emphasizes a balanced approach.

## Acceptance Criteria

1. **Setup Testcontainers Dependencies**
   - Install required Testcontainer libraries
   - Configure test environment to support Docker container operations
   - Create helper utilities for container management if needed

2. **PostgreSQL Integration Tests**
   - Implement Testcontainers for database integration tests
   - Create test fixtures for the most critical repository classes
   - Ensure tenant isolation features are tested with real database
   - Verify MikroORM entity behaviors in a real database environment

3. **Redis Integration Tests**
   - Implement Redis Testcontainers for caching functionality
   - Test the RedisCacheService with a real Redis instance
   - Verify tenant-aware caching behaviors
   - Test tag-based cache invalidation with real Redis

4. **Multi-Tenancy Testing**
   - Create specialized tests for multi-tenancy features using real databases
   - Verify data isolation between tenants in repository operations
   - Test tenant-specific caching strategies

5. **Combined Infrastructure Testing**
   - Create tests that use multiple containers (PostgreSQL + Redis)
   - Test services that depend on both data persistence and caching
   - Verify proper resource cleanup after tests

6. **Test Performance Optimization**
   - Implement container reuse strategies for test performance
   - Configure optimal container startup parameters
   - Ensure tests remain fast enough for developer workflow

7. **Documentation**
   - Update testing guides with Testcontainers examples
   - Document best practices for creating container-based tests
   - Add troubleshooting section for common Docker-related issues

## Estimation

Story Points: 5

## Tasks

1. - [ ] Setup Testcontainers Infrastructure
   1. - [ ] Add `@testcontainers/postgresql` and `@testcontainers/redis` packages
   2. - [ ] Create utility classes for common container operations
   3. - [ ] Set up Docker environment verification in CI pipeline
   4. - [ ] Create shared test fixtures for common container configurations

2. - [ ] PostgreSQL Repository Integration Tests
   1. - [ ] Create PostgreSQL container test base class
   2. - [ ] Implement UserRepository integration tests with real PostgreSQL
   3. - [ ] Add tests for RoleRepository and PermissionRepository
   4. - [ ] Test complex queries and relationships with real database

3. - [ ] Redis Cache Service Integration Tests
   1. - [ ] Create Redis container test configuration
   2. - [ ] Implement RedisCacheService integration tests
   3. - [ ] Test tenant isolation in cache operations
   4. - [ ] Verify tag-based cache invalidation functionality

4. - [ ] Multi-Tenant Database Tests
   1. - [ ] Create specialized multi-tenancy test fixtures
   2. - [ ] Test tenant isolation at the database level
   3. - [ ] Verify tenant context propagation to database operations

5. - [ ] Service Layer Integration Tests
   1. - [ ] Test UserService with real database
   2. - [ ] Implement combined PostgreSQL and Redis tests for services
   3. - [ ] Create tests for cache-enabled repository operations

6. - [ ] Performance Optimization
   1. - [ ] Implement container reuse when appropriate
   2. - [ ] Configure optimal startup parameters for containers
   3. - [ ] Measure and document test performance impacts

7. - [ ] Documentation Updates
   1. - [ ] Update testing guide with Testcontainers examples
   2. - [ ] Document container setup and configuration best practices
   3. - [ ] Add Testcontainers troubleshooting section

## Constraints

- Integration tests must clean up all resources after completion
- Container-based tests should be kept separate from unit tests
- Tests should remain fast enough for the regular development workflow
- Docker must be available in the development and CI environments
- Container configuration should be centralized when possible
- Tests should handle potential Docker-related failures gracefully

## Implementation Details

### PostgreSQL Test Configuration Example

```typescript
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { MikroORM } from '@mikro-orm/core';
import { User } from '../entities/user.entity';

describe('UserRepository Integration Tests', () => {
  let pgContainer;
  let orm: MikroORM;

  beforeAll(async () => {
    // Start PostgreSQL container
    pgContainer = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();
    
    // Initialize ORM with container connection
    orm = await MikroORM.init({
      type: 'postgresql',
      host: pgContainer.getHost(),
      port: pgContainer.getMappedPort(5432),
      user: pgContainer.getUsername(),
      password: pgContainer.getPassword(),
      dbName: pgContainer.getDatabase(),
      entities: [User, Role, Permission],
      debug: false,
    });
    
    // Create schema
    await orm.getSchemaGenerator().createSchema();
  });

  afterAll(async () => {
    await orm.close();
    await pgContainer.stop();
  });

  // Tests...
});
```

### Redis Test Configuration Example

```typescript
import { RedisContainer } from '@testcontainers/redis';
import { Redis } from 'ioredis';
import { RedisCacheService } from './redis-cache.service';

describe('RedisCacheService Integration Tests', () => {
  let redisContainer;
  let redisClient: Redis;
  let cacheService: RedisCacheService;

  beforeAll(async () => {
    // Start Redis container
    redisContainer = await new RedisContainer().start();
    
    // Create client connected to container
    redisClient = new Redis({
      host: redisContainer.getHost(),
      port: redisContainer.getMappedPort(6379)
    });
    
    // Initialize service with real Redis
    cacheService = new RedisCacheService(redisClient, mockTenantContext);
  });

  afterAll(async () => {
    await redisClient.quit();
    await redisContainer.stop();
  });

  // Tests...
});
```

## References

- Architecture Document Testing Strategy Section
- [Testcontainers Documentation](https://node.testcontainers.org/)
- Redis and PostgreSQL service implementations

## Chat Log

**User (2025-04-02):** Sollten wir eine Story für die Testcontainers-Integration erstellen?

**AI:** Ja, sehr gute Idee. Ich werde eine Story speziell für die Testcontainers-Integration erstellen, um realistischere Integrationstests in unserem Projekt zu ermöglichen.
