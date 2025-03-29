Let's build a modular and test-driven backend system using NestJS, designed for enterprise-grade applications. The system will initially implement secure user authentication and session management (login, logout, session expiration). The frontend will be written in React (outside the scope of this repo), and will communicate via a well-structured REST API (or GraphQL later on).

We want to follow a clean architecture and use TDD (Test-Driven Development) from day one. The backend should be easy to extend with new features like user roles, licensing, multi-tenancy, and internationalization.

The MVP should support:

- User registration and login via email + password
- JWT-based authentication with access & refresh tokens
- Secure logout, token expiration, and refresh endpoint
- Role-based access control (optional for MVP, but structure for it now)
- Session metadata tracking (e.g., creation time, last seen)
- Clean REST API structure following best practices
- Comprehensive test coverage (unit & integration tests)
- Clear logging and basic auditing for login/logout events
- Configurable environment-based setup (dev, test, prod)
- Rate limiting and brute-force prevention

Tech Stack:

- NestJS
- PostgreSQL (via Prisma or TypeORM)
- Docker + docker-compose for local dev
- Testing with Jest (unit, integration)
- Swagger for API docs
- ESLint + Prettier + Commitlint
- dotenv for environment configs
- Class-validator + class-transformer for input validation
- Optional: Redis for token/session storage

We want a scalable, maintainable codebase that could later support plugin-based extensions, a GraphQL API layer, event-driven features (like CQRS or outbox pattern), and integration with third-party systems (e.g., license servers, monitoring tools, SMTP). Everything should be built with flexibility and long-term quality in mind.

Start with a PRD + Story breakdown focused on the Authentication system as Milestone 1.
