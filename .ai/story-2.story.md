# Epic-1 - Story-2

MikroORM Integration and Configuration

**As a** developer
**I want** MikroORM integrated and configured within the NestJS project
**so that** I can interact with the PostgreSQL database for data persistence using the chosen ORM.

## Status

Completed

## Context

- This story builds upon the initialized NestJS project from Story 1.
- It introduces the data persistence layer by integrating MikroORM, as specified in `.ai/arch.md`.
- Configuration will leverage the `@nestjs/config` module set up in Story 1.
- This setup is crucial for implementing domain entities and repositories later.
- Target database is PostgreSQL.
- MikroORM follows the Repository and Unit of Work patterns, which aligns with our Domain-Driven Design approach in the architecture document.

## Estimation

Story Points: 2

## Tasks

1. - [x] Install MikroORM Dependencies
    - [x] Add `@mikro-orm/core`, `@mikro-orm/nestjs`, `@mikro-orm/postgresql`, and `@mikro-orm/cli` to `package.json` using `bun add`.
2. - [x] Configure MikroORM Module
    - [x] Import `MikroOrmModule` in `src/backend/src/app.module.ts`.
    - [x] Use `MikroOrmModule.forRootAsync` to load database configuration asynchronously.
    - [x] Inject `ConfigService` to retrieve database credentials (host, port, user, password, dbName) from `.env`.
    - [x] Configure basic MikroORM options:
        - [x] `entities`: Set path for entity discovery (e.g., `['dist/**/*.entity.js']`).
        - [x] `entitiesTs`: Set path for TypeScript entity discovery (e.g., `['src/**/*.entity.ts']`).
        - [x] `dbName`: From config.
        - [x] `type`: 'postgresql'.
        - [x] `debug`: Enable debug logging based on environment (e.g., `process.env.NODE_ENV !== 'production'`).
        - [x] `autoLoadEntities`: `true`.
3. - [x] Set up MikroORM CLI
    - [x] Create `src/backend/mikro-orm.config.ts` referencing the asynchronous configuration setup (potentially exporting the options factory used in `forRootAsync`).
    - [x] Add MikroORM CLI scripts to `src/backend/package.json`:
        - [x] `orm:debug`: `mikro-orm debug`
        - [x] `orm:schema:create`: `mikro-orm schema:create`
        - [x] `orm:schema:update`: `mikro-orm schema:update --run`
        - [x] `orm:migration:create`: `mikro-orm migration:create`
        - [x] `orm:migration:up`: `mikro-orm migration:up`
        - [x] `orm:migration:down`: `mikro-orm migration:down`
4. - [x] Create Base Entity
    - [x] Create `src/backend/src/common/entities/base.entity.ts`.
    - [x] Define common fields like `id` (primary key, UUID), `createdAt`, `updatedAt` using MikroORM decorators.
5. - [x] Create Example Entity (e.g., Tenant)
    - [x] Create `src/backend/src/tenants/entities/tenant.entity.ts` (create `tenants` module directory if needed).
    - [x] Define basic fields based on `arch.md` (e.g., `name`, `domain`), inheriting from `BaseEntity`.
    - [x] Ensure the entity is discovered by MikroORM.
6. - [x] Generate Initial Database Schema
    - [x] Run `bun run orm:migration:create -- --initial` (adjust script name if needed).
    - [x] Verify the generated migration file in `src/backend/migrations/`.
    - [x] Run `bun run orm:migration:up` to apply the migration to the database (ensure database is running).
7. - [x] Implement Database Health Check
    - [x] Inject `EntityManager` or `MikroORM` into `src/backend/src/app.service.ts` or a dedicated health service.
    - [x] Add a method to check database connectivity (e.g., `em.getKnex().raw('SELECT 1')`).
    - [x] Integrate this check into the `/health` endpoint in `src/backend/src/app.controller.ts`, returning database status.
    - [x] Example implementation:

      ```typescript
      // In app.service.ts
      @Injectable()
      export class AppService {
        constructor(
          private readonly em: EntityManager,
        ) {}
      
        getHello(): string {
          return 'Hello World!';
        }
      
        async checkDbConnection(): Promise<boolean> {
          try {
            await this.em.getConnection().execute('SELECT 1');
            return true;
          } catch (error) {
            console.error('Database connection failed:', error);
            return false;
          }
        }
      }
      
      // In app.controller.ts
      @Controller()
      export class AppController {
        constructor(private readonly appService: AppService) {}
      
        @Get()
        getHello(): string {
          return this.appService.getHello();
        }
      
        @Get('health')
        async checkHealth() {
          const dbStatus = await this.appService.checkDbConnection();
          
          return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            checks: {
              database: dbStatus ? 'up' : 'down',
              // Add other checks as needed (e.g., Redis, external services)
            }
          };
        }
      }
      ```

8. - [x] Add Database Health Check Test
    - [x] Update the E2E test (`src/backend/test/app.e2e-spec.ts`) to check the database status in the `/health` endpoint response.

## Constraints

- Use PostgreSQL as the database system.
- Utilize `@nestjs/config` for environment variable management.
- Adhere to MikroORM best practices and the structure defined in `arch.md`.
- Use `bun` for all package management and script execution.
- Implement Repository Pattern with MikroORM as specified in the architecture document.

## Data Models / Schema

- Introduction of `BaseEntity`.
- Initial `Tenant` entity schema based on `arch.md`.

## Structure

- Modify `src/backend/src/app.module.ts`.
- Add `src/backend/mikro-orm.config.ts`.
- Add `src/backend/src/common/entities/base.entity.ts`.
- Add `src/backend/src/tenants/entities/tenant.entity.ts`.
- Add migration files in `src/backend/migrations/`.

## Diagrams

- N/A

## Dev Notes

- Ensure the PostgreSQL database container (defined in `docker-compose.yml` if used) is running and accessible before running migrations or tests.
- Update `.env` with the correct database credentials (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).
- The MikroORM CLI requires TypeScript configuration (`useTsNode: true` or similar in CLI config) or compiled JS files to work correctly. Ensure `mikro-orm.config.ts` is properly set up.
- MikroORM's Repository pattern implementation provides strong typing and encapsulation for database operations, making it ideal for DDD architecture.

## Chat Command Log

- User: ja, lass uns nun mit der zweiten story beginnen
- Agent: Reading .ai/story-1.story.md...
- Agent: Reading .ai/arch.md...
- User: und weiter?
- Agent: Generated draft for story-2.story.md.
- User: ja, sehr gut, bitte erstelle ihn auch als file
- Agent: Creating .ai/story-2.story.md...
- User: überprüfe die story darauf, ob sie best practices entspricht
- Agent: Überprüfung abgeschlossen, zwei Verbesserungsvorschläge identifiziert.
- User: ja, erwähne das mit dem repository-pattern, und gib ein konkretes beispiel für die health-check-implementierung
- Agent: Aktualisiere story-2.story.md mit Repository-Pattern-Erklärung und Health-Check-Beispiel.
- User: ok, dann führe nun einen regelkonformen commit durch, bevor du mit der implementierung anfängst
- Agent: Commit für story-2.story.md durchgeführt.
- User: beginne nun mit der implementierung
- Agent: Implementierung der MikroORM-Integration gestartet...
- Agent: Installation von MikroORM-Paketen...
- Agent: Erstellung der Konfigurationsdatei...
- Agent: Implementierung der BaseEntity...
- Agent: Implementierung der Tenant-Entity...
- Agent: Integration des MikroORM-Moduls in app.module.ts...
- Agent: Aktualisierung des Health-Check-Endpunkts...
- Agent: Erstellung der Migration...
- Agent: Tests erfolgreich durchgeführt.
- User: überprüfe die story darauf, ob sie best practices entspricht
