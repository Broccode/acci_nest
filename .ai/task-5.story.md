# Task-5

PoC: Integrate Suites Testing Framework for Auth Module

**As a** developer
**I want** to evaluate the Suites testing framework by refactoring the tests for the `auth` module
**So that** we can determine its suitability for improving our unit testing workflow.

## Status

Completed

## Context

- Current unit tests utilize Jest and `@nestjs/testing` with manual mocking strategies (e.g., `jest.fn()`, `Test.createTestingModule` with `useValue`).
- The `Suites` framework ([https://suites.dev/](https://suites.dev/)) aims to simplify dependency injection testing, particularly for NestJS applications.
- We are conducting this Proof of Concept (PoC) to assess potential benefits (reduced boilerplate, improved consistency, type safety) against the costs (refactoring effort, learning curve, adding a dependency).
- The `auth` module, specifically `AuthService`, was chosen for this PoC due to its multiple service dependencies (`UserService`, `JwtService`, `RefreshTokenService`, `MfaService`), making it a representative candidate for evaluating complex mocking scenarios.

## Acceptance Criteria

1. **Setup Suites Dependency:**
    - Install the `suites` package as a dev dependency.
    - Verify compatibility with existing testing libraries (Jest) and NestJS version.
    - Perform any necessary Jest configuration adjustments as per `Suites` documentation.

2. **Refactor AuthService Tests (`auth.service.spec.ts`):**
    - Replace the existing `Test.createTestingModule` setup with `Suite.create` from the `Suites` framework.
    - Replace manual mock implementations (`useValue: { jest.fn()... }`) with `Suites`' `provideMock` utility.
    - Adapt individual test cases (`it(...)`) to work with the `Suites`-managed instance and mocks.
    - Ensure all original test assertions pass after the refactoring.
    - The core logic of the tests should remain unchanged; focus is on the setup and mocking mechanism.

3. **Evaluate and Document Findings:**
    - Compare the refactored `auth.service.spec.ts` with its original version regarding lines of code, readability, and complexity of the setup/mocking part.
    - Document the developer experience during the refactoring process (ease of use, clarity of `Suites` API, debugging experience).
    - Provide a preliminary estimate of the effort required to migrate the remaining unit tests in the project based on this PoC experience.
    - Summarize findings (pros/cons observed in this specific context) within this story file's Fazit section.

4. **Recommendation:**
    - Based on the evaluation, provide a clear recommendation on whether to proceed with adopting `Suites` for the entire project, conduct further PoCs, or stick with the current testing strategy.

## Estimation

Story Points: 2

## Tasks

1. - [x] Setup Suites Dependency
    1. - [x] Add `suites` dev dependency via package manager (`npm install --save-dev suites` or `yarn add --dev suites` or `bun add --dev suites`).
    2. - [x] Review `Suites` documentation for peer dependencies or compatibility notes.
    3. - [x] Check `jest.config.js` (or equivalent) for any required setup/transform configurations.
2. - [x] Refactor `auth.service.spec.ts` using `Suites`
    1. - [x] Import `TestBed` and `Mocked` from correct packages.
    2. - [x] Rewrite the `beforeAll` block using `TestBed.solitary(...).compile()`.
    3. - [x] Use `unit` to get the service instance.
    4. - [x] Use `unitRef.get(Dependency)` to access mocked dependencies.
    5. - [x] Adapt mock configuration within `beforeEach` or `it` blocks.
    6. - [x] Run `jest src/backend/src/auth/services/auth.service.spec.ts` and fix any failures.
3. - [x] Evaluate and Document Findings
    1. - [x] Perform a code diff and analyze changes in setup complexity.
    2. - [x] Add notes on ease of use/learning curve to the Fazit section.
    3. - [x] Calculate rough effort estimation for full migration.
    4. - [x] Formulate a preliminary recommendation.

## Constraints

- The scope of this PoC is strictly limited to `src/backend/src/auth/services/auth.service.spec.ts`.
- The primary goal is to evaluate the mocking and test setup capabilities of `Suites`, not to refactor the internal logic of the test cases themselves.
- We will continue using the existing Jest test runner.

## Implementation Details Example (Intended Syntax)

```typescript
// Example of how the setup might look with Suites in auth.service.spec.ts
import { Suite, provideMock } from 'suites';
import { AuthService } from './auth.service';
import { UserService } from '../../users/services/user.service';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from './refresh-token.service';
import { MfaService } from './mfa.service';
import { User } from '../../users/entities/user.entity';

describe('AuthService with Suites', () => {
  let suite: Suite<AuthService>;
  let service: AuthService;
  let userServiceMock: UserService;
  let jwtServiceMock: JwtService;
  // ... other mocks

  beforeEach(async () => {
    suite = await Suite.create<AuthService>()
      .override(UserService, provideMock({
          findByEmail: jest.fn(),
          validatePassword: jest.fn(),
      }))
      .override(JwtService, provideMock({
          sign: jest.fn().mockReturnValue('mocked.jwt.token'),
      }))
      .override(RefreshTokenService, provideMock({
          generateRefreshToken: jest.fn().mockResolvedValue('mocked-refresh-token'),
      }))
      .override(MfaService, provideMock({
          verifyToken: jest.fn(),
      }))
      .compile();

    service = suite.get(AuthService);
    userServiceMock = suite.get(UserService);
    jwtServiceMock = suite.get(JwtService);
    // ... get other mocks
  });

  afterEach(() => {
      jest.clearAllMocks(); // Still needed if using jest.fn within provideMock
  });

  it('should be defined', () => {
      expect(service).toBeDefined();
  });

  describe('validateUser', () => {
      it('should return user without password when credentials are valid', async () => {
          // Arrange
          (userServiceMock.findByEmail as jest.Mock).mockResolvedValue(mockUser);
          (userServiceMock.validatePassword as jest.Mock).mockResolvedValue(true);

          // Act
          const result = await service.validateUser('test@example.com', 'password', 'tenant-123');

          // Assert
          expect(userServiceMock.findByEmail).toHaveBeenCalledWith('test@example.com', 'tenant-123');
          // ... more assertions
      });
      // ... other tests using mocked dependencies via suite.get(...)
  });
});

```

## References

- Original Test File: `src/backend/src/auth/services/auth.service.spec.ts`
- [Suites Documentation](https://suites.dev/docs/overview/what-is-suites)
- Current `package.json`
- Previous analysis discussion in chat.

## Chat Log

**User (Previous Session):** Sagt dir das suites-testing-framework etwas? @<https://suites.dev/docs/overview/what-is-suites>
**AI (Previous Session):** Ja, Captain Picard, das `Suites`-Testframework ist mir bekannt... [Summary] ... Es scheint ein spezialisiertes Werkzeug zu sein... Haben Sie spezifische Fragen...?
**User (Previous Session):** ja, bitte überprüfe die komplette codebase (@src ) inklusive unserer tests darauf, ob ein refactoring zu suites sinn machen würde. und wenn ja, wieviel aufwand es erfordern würde.
**AI (Previous Session):** Verstanden, Captain... [Analysis of current tests] ... Empfehlung: Ich empfehle, `Suites` zunächst in *einem* Modul mit komplexeren Tests prototypisch zu implementieren... Sollen wir einen solchen Prototypen für ein spezifisches Modul in Betracht ziehen, Captain?
**User (Previous Session):** ja, lass uns das als poc machen. welches module würdest du dafür empfehlen?
**AI (Previous Session):** Ausgezeichnet, Captain Picard... schlage ich vor, das **`auth`-Modul** für diesen PoC zu verwenden... Sind Sie mit der Wahl des `auth`-Moduls für den PoC einverstanden, Captain?
**User (Current Session):** ja, bitte erstelle dafür auch einen task (siehe dazu als vergleich @task-4.story.md).
**AI (Current Session):** Verstanden, Captain Picard. Ich werde eine neue Task-Datei `.ai/task-5.story.md` für den Proof of Concept zur Integration des `Suites`-Testframeworks erstellen.

## Fazit

*(PoC completed)*

**Code Comparison & Setup Complexity:**

- The `@suites/unit` setup using `TestBed.solitary()` significantly reduces boilerplate in the `beforeAll`/`beforeEach` block compared to `@nestjs/testing`'s `Test.createTestingModule`.
- Explicit listing of providers and mock implementations (`useValue`) is replaced by automatic mocking.
- Mock configuration moves closer to the individual test cases, potentially improving test readability.

**Developer Experience:**

- Initial setup was challenging due to unclear package names and API details (finding correct imports for `Mocked`, understanding `TestBed.solitary` vs. `.mock().final` vs. `unitRef.get`).
- Documentation was spread across multiple pages, requiring careful reading.
- Once the correct pattern (`TestBed.solitary`, `unitRef.get`, configure mocks in `it`) was established, the refactoring was straightforward.
- The automatic mocking is convenient.

**Effort Estimation (Full Migration):**

- Refactoring the remaining ~48 `.spec.ts` files is estimated to take **8-33 hours**, depending on complexity.

**Preliminary Recommendation:**

- `@suites/unit` offers benefits in reducing setup boilerplate and potentially improving test readability.
- However, the learning curve and the non-trivial refactoring effort must be considered.
- **Recommendation:** Given the successful PoC but the significant effort for full migration, consider migrating *new* tests to `@suites/unit` or migrating existing tests incrementally module by module as they are touched, rather than a large-scale refactoring effort. A final decision should weigh the perceived benefits against the development time cost.
