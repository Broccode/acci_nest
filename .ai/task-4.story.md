# Task-4

Testcontainers Integration for Realistic Integration Tests

**As a** developer
**I want** to implement Testcontainers for integration tests
**So that** we can test our application against real infrastructure dependencies in an isolated, reproducible manner.

## Status

Completed

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

1. - [x] Setup Testcontainers Infrastructure
   1. - [x] Add `@testcontainers/postgresql` and `@testcontainers/redis` packages
   2. - [x] Create utility classes for common container operations
   3. - [x] Set up Docker environment verification in CI pipeline
   4. - [x] Create shared test fixtures for common container configurations

2. - [x] PostgreSQL Repository Integration Tests
   1. - [x] Create PostgreSQL container test base class
   2. - [x] Implement UserRepository integration tests with real PostgreSQL
   3. - [x] Add tests for RoleRepository and PermissionRepository
   4. - [x] Test complex queries and relationships with real database

3. - [x] Redis Cache Service Integration Tests
   1. - [x] Create Redis container test configuration
   2. - [x] Implement RedisCacheService integration tests
   3. - [x] Test tenant isolation in cache operations
   4. - [x] Verify tag-based cache invalidation functionality

4. - [x] Multi-Tenant Database Tests
   1. - [x] Create specialized multi-tenancy test fixtures
   2. - [x] Test tenant isolation at the database level
   3. - [x] Verify tenant context propagation to database operations

5. - [x] Combined Infrastructure Testing
   1. - [x] Create tests that use multiple containers (PostgreSQL + Redis)
   2. - [x] Test services that depend on both data persistence and caching
   3. - [x] Verify proper resource cleanup after tests

6. - [x] Test Performance Optimization
   1. - [x] Implement container reuse strategies for test performance
   2. - [x] Configure optimal container startup parameters
   3. - [x] Ensure tests remain fast enough for developer workflow

7. - [x] Documentation
   1. - [x] Update testing guides with Testcontainers examples
   2. - [x] Document best practices for creating container-based tests
   3. - [x] Add troubleshooting section for common Docker-related issues

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
import { Test, TestingModule } from '@nestjs/testing';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { UserRepository } from '../repositories/user.repository';
import { User, Role, Permission } from '../entities';

describe('UserRepository Integration Tests', () => {
  let pgContainer;
  let moduleRef: TestingModule;
  let userRepository: UserRepository;

  beforeAll(async () => {
    // Start PostgreSQL container
    pgContainer = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();
    
    // Create testing module with dynamic database connection
    moduleRef = await Test.createTestingModule({
      imports: [
        MikroOrmModule.forRoot({
          type: 'postgresql',
          host: pgContainer.getHost(),
          port: pgContainer.getMappedPort(5432),
          user: pgContainer.getUsername(),
          password: pgContainer.getPassword(),
          dbName: pgContainer.getDatabase(),
          entities: [User, Role, Permission],
          debug: false,
        }),
        MikroOrmModule.forFeature([User, Role, Permission]),
      ],
      providers: [],
    }).compile();
    
    // Get repository from NestJS dependency injection container
    userRepository = moduleRef.get<UserRepository>(UserRepository);
    
    // Create schema
    const orm = moduleRef.get('MikroORM');
    await orm.getSchemaGenerator().createSchema();
  });

  afterAll(async () => {
    await moduleRef.close();
    await pgContainer.stop();
  });

  it('should create a user', async () => {
    // Create test using repository
    const user = userRepository.create({ name: 'Test User', email: 'test@example.com' });
    await userRepository.persistAndFlush(user);
    
    // Verify using repository
    const foundUser = await userRepository.findOne({ email: 'test@example.com' });
    expect(foundUser).toBeDefined();
    expect(foundUser.name).toBe('Test User');
  });

  // More tests...
});
```

### Redis Test Configuration Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { RedisContainer } from '@testcontainers/redis';
import { RedisCacheService } from '../cache/redis-cache.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

describe('RedisCacheService Integration Tests', () => {
  let redisContainer;
  let moduleRef: TestingModule;
  let cacheService: RedisCacheService;
  let mockTenantContext: TenantContextService;

  beforeAll(async () => {
    // Mock tenant context
    mockTenantContext = { getCurrentTenantId: jest.fn().mockReturnValue('test-tenant') } as any;

    // Start Redis container
    redisContainer = await new RedisContainer().start();
    
    // Create testing module with dynamic Redis connection
    moduleRef = await Test.createTestingModule({
      imports: [
        CacheModule.registerAsync({
          useFactory: () => ({
            store: redisStore,
            host: redisContainer.getHost(),
            port: redisContainer.getMappedPort(6379),
            ttl: 60 // Default TTL
          }),
        }),
      ],
      providers: [
        RedisCacheService,
        {
          provide: TenantContextService,
          useValue: mockTenantContext,
        },
      ],
    }).compile();
    
    // Get service from NestJS dependency injection container
    cacheService = moduleRef.get<RedisCacheService>(RedisCacheService);
  });

  afterAll(async () => {
    await moduleRef.close();
    await redisContainer.stop();
  });

  it('should store and retrieve values with tenant isolation', async () => {
    await cacheService.set('test-key', 'test-value');
    const result = await cacheService.get('test-key');
    expect(result).toBe('test-value');
  });

  it('should properly invalidate cache by tag', async () => {
    await cacheService.set('tagged-key', 'tagged-value', ['test-tag']);
    await cacheService.invalidateTags(['test-tag']);
    const result = await cacheService.get('tagged-key');
    expect(result).toBeNull();
  });

  // More tests...
});
```

## References

- Architecture Document Testing Strategy Section
- [Testcontainers Documentation](https://node.testcontainers.org/)
- Redis and PostgreSQL service implementations

## Chat Log

**User (2025-04-02):** Sollten wir eine Story für die Testcontainers-Integration erstellen?

**AI:** Ja, sehr gute Idee. Ich werde eine Story speziell für die Testcontainers-Integration erstellen, um realistischere Integrationstests in unserem Projekt zu ermöglichen.

**User (2025-04-03):** Lass uns nun die Umsetzung von story-7 planen, nachdem wir vorhin task-8 umgesetzt haben.

**AI:** Ich schlage einen schrittweisen Implementierungsplan für die Testcontainers-Integration vor, beginnend mit der Einrichtung der grundlegenden Infrastruktur.

**User:** Ist @story-7.story.md schon so angepasst, dass wir auch wirklich das testing-modul von nestjs verwenden, und nicht mehr das von bun (wurde in @task-8.story.md umgesetzt)?

**AI:** Nach Überprüfung der Story habe ich festgestellt, dass die Codebeispiele noch nicht an das @nestjs/testing-Modul angepasst waren. Ich habe die Beispiele aktualisiert, um die korrekte Integration mit dem NestJS-Testing-Framework darzustellen.

**User:** Fahre nun fort mit der Implementierung, gehe dabei sehr sorgfältig vor, und denke sehr gut nach.

**AI:** Ich habe zunächst die testcontainers-Pakete installiert und dann die Kerninfrastruktur implementiert:

1. Eine PostgresTestContainer-Klasse für PostgreSQL-Integration mit MikroORM
2. Eine RedisTestContainer-Klasse für Redis-Integration mit dem Cache-Modul
3. Eine MultiTenantTestEnvironment-Klasse für kombinierte Tests
4. Integrationstests für das UserRepository mit einem echten PostgreSQL
5. Integrationstests für den RedisCacheService mit einem echten Redis
6. Ein kombinierter Test für Multi-Tenant-Isolation über beide Infrastrukturkomponenten
7. Eine umfassende Dokumentation zur Verwendung der Testcontainers

**User:** schaue dir bitte an, was du mit @redis-cache.integration.spec.ts gemacht hast

**AI:** Ich habe die beschädigten Import-Anweisungen in den Integrationstestdateien korrigiert, die zu Syntax- und Typfehlern führten. Die größte Herausforderung war, dass die Dateien falsche Pfad-Syntax enthielten.

**User:** ja, bitte

**AI:** Ich habe fehlende Import-Pfade und Syntax-Fehler in allen Integrationstests behoben. Anschließend musste ich die Tests für die User-Entity aktualisieren, da diese ein eingebettetes profile-Objekt statt eines direkten name-Felds verwendet.

**User:** ja, untersuche das user-entity

**AI:** Die User-Entity verwendet ein eingebettetes profile-Objekt mit firstName und lastName, nicht ein direktes name-Feld. Ich habe die Tests entsprechend angepasst und auch die Methode getSchemaGenerator() korrigiert, die vom MikroORM-Objekt statt von Connection aufgerufen werden sollte.

**User:** ja, fahre nun fort

**AI:** Ich habe jetzt mit der Implementierung der Integrationstests für das RoleRepository und PermissionRepository fortgefahren und die Story aktualisiert, um den Abschluss dieser Aufgaben zu dokumentieren.

## Fazit

Die Integration von Testcontainers in unser Projekt wurde erfolgreich abgeschlossen. Wir haben nun eine robuste Testinfrastruktur, die es uns ermöglicht, Integrationstests mit realen Infrastrukturkomponenten wie PostgreSQL und Redis durchzuführen. Die Hauptvorteile dieser Implementierung sind:

1. **Realistische Tests**: Wir können nun Tests gegen echte Datenbanken und Caches ausführen, was ein höheres Vertrauen in die Korrektheit unserer Code-Implementierung gibt.

2. **Isolation und Reproduzierbarkeit**: Jeder Testlauf verwendet frische Container-Instanzen, wodurch Tests isoliert und reproduzierbar sind.

3. **Multi-Tenant-Validierung**: Wir können die Mandantenisolation mit echter Datenbankinfrastruktur testen, was kritisch für unsere Kernarchitektur ist.

4. **Kombinierte Tests**: Die `MultiTenantTestEnvironment`-Klasse ermöglicht es uns, Tests zu erstellen, die mehrere Infrastrukturkomponenten gleichzeitig verwenden.

5. **Leistungsoptimierung**: Durch die Implementierung von Container-Wiederverwendungsstrategien und optimalen Startparametern haben wir die Testgeschwindigkeit verbessert.

Die neu erstellten Hilfsbibliotheken (PostgresTestContainer, RedisTestContainer, MultiTenantTestEnvironment) werden in zukünftigen Stories wiederverwendet, um die Testabdeckung für neue Features zu gewährleisten.
