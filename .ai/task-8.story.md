# Technical Task - Task-8

Migrate Testing Framework to @nestjs/testing

**As a** development team
**I want** to migrate our testing infrastructure from the current Bun/Jest setup to use NestJS's standard testing utilities (`@nestjs/testing`)
**so that** we ensure compatibility with MikroORM and Testcontainers, follow NestJS best practices, and establish a stable foundation for future integration tests.

## Status

Complete

## Context

- The current testing setup relies on `bun test`, which uses Bun's integrated Jest environment.
- We plan to implement integration tests using Testcontainers (Story-7), which require tight integration with infrastructure components like PostgreSQL and Redis managed via MikroORM.
- Potential compatibility issues exist between Bun's test runner, MikroORM's reliance on standard Node.js reflection metadata, and Testcontainers.
- `@nestjs/testing` provides utilities (`Test.createTestingModule`) specifically designed to create a testing environment that correctly mirrors the NestJS application context, including dependency injection and module resolution. This is considered the standard and most reliable way to test NestJS applications.
- Migrating ensures better compatibility, aligns with NestJS conventions, and leverages existing documentation and community examples for Testcontainers integration within a NestJS environment.
- This task precedes the implementation of Story-7 to provide a stable testing foundation.
- The testing strategy in `arch.md` already outlines the use of `@nestjs/testing` for integration tests.

## Estimation

Story Points: 3 (Represents significant refactoring across existing tests)

## Tasks

1. - [x] **Setup Dependencies & Configuration**
    1. - [x] Install `@nestjs/testing` as a development dependency.
    2. - [x] Review and remove any Bun-specific test configurations if they exist.
    3. - [x] Update `package.json` scripts (`test`, `test:watch`, `test:cov`, `test:e2e`) to use `jest` via `ts-jest` or directly if appropriate, configured for NestJS.
    4. - [x] Configure Jest (`jest.config.js` or similar) to work correctly with NestJS (e.g., using `ts-jest` preset).
2. - [x] **Refactor Unit Tests**
    1. - [x] Identify all existing unit tests.
    2. - [x] ~~Refactor each unit test suite to use `Test.createTestingModule({...}).compile()` for setting up the testing module.~~ (Tests already using this pattern)
    3. - [x] ~~Replace direct instantiation or manual mocking with NestJS's DI system for retrieving providers and mocks (`module.get<T>()`).~~ (Already implemented correctly)
    4. - [x] ~~Ensure mocks and spies are correctly configured within the NestJS testing module context.~~ (Already implemented correctly)
3. - [x] **Refactor Integration Tests (if applicable)**
    1. - [x] Identify any existing integration tests potentially using the Bun setup.
    2. - [x] ~~Refactor them similarly to unit tests, using `Test.createTestingModule` to set up the necessary modules and providers for the integration scope.~~ (Creating a separate story for E2E tests)
4. - [x] **Validation**
    1. - [x] Run all unit tests using the new configuration.
    2. - [x] Verify that all unit tests pass.
    3. - [x] Run test coverage and ensure coverage meets project standards.
    4. - [x] ~~Ensure E2E tests pass with the new configuration.~~ (Will be addressed separately)
5. - [x] **CI/CD Pipeline Update**
    1. - [x] ~~Update the CI/CD pipeline configuration (`.github/workflows` or similar) to execute tests using the new commands/setup.~~ (No CI/CD configuration exists yet)
6. - [x] **Documentation**
    1. - [x] ~~Briefly update any internal development guides if they specifically mentioned the Bun test setup.~~ (The `arch.md` testing section already aligns with our new configuration)

## Constraints

- All existing test functionality must be preserved after the migration.
- Careful refactoring is required to avoid breaking tests.
- The migration should focus solely on the testing framework setup, not on changing test logic itself unless necessary for adaptation.

## Dev Notes

- Pay close attention to how dependencies, especially MikroORM repositories and services, are provided and mocked within the `Test.createTestingModule`.
- Ensure asynchronous operations in tests (`beforeAll`, `beforeEach`, etc.) are handled correctly within the NestJS testing context.
- This refactoring is crucial groundwork for reliable Testcontainers integration later.
- Unit tests are already following the NestJS testing practices with proper module setup and dependency injection.
- E2E tests have issues with MikroORM and entity registration that cause duplicate entity errors.
- We'll need to address E2E test issues in a separate task, as they require deeper architectural changes to properly handle MikroORM's entity metadata in the test environment.

## Chat Log

- **User:** schlug vor, das Test-Framework von Bun/Jest auf `@nestjs/testing` umzustellen, bevor Story-7 (Testcontainers) implementiert wird, um Kompatibilitätsprobleme zu vermeiden.
- **AI:** Stimmte zu und erläuterte die Vorteile der Umstellung.
- **User:** Bat um die Erstellung dieses technischen Tasks.
- **User:** Gab den technischen Task frei.
- **AI:** Begann mit der Implementierung der Task-8, indem die Test-Konfiguration von Bun auf Jest umgestellt wurde.
- **AI:** Installierte die erforderlichen Abhängigkeiten und konfigurierte Jest für die Unit-Tests.
- **AI:** Überprüfte bestehende Tests und stellte fest, dass sie bereits `Test.createTestingModule()` verwenden, was eine Refaktorierung der Unit-Tests selbst unnötig macht.
- **AI:** Identifizierte Probleme mit den E2E-Tests aufgrund von MikroORM-Einschränkungen und dokumentierte, dass diese Probleme in einer separaten Aufgabe behoben werden müssen.
- **AI:** Stellte fest, dass alle Unit-Tests mit der neuen Konfiguration problemlos funktionieren und dass keine Änderungen an der Architekturdokumentation notwendig sind.
