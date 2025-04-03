# 🏢 ACCI Nest

Robust, scalable multi-tenant platform with plugin architecture, built with NestJS and React using the Bun runtime.

## 📋 Overview

ACCI Nest is a scalable, multi-tenant application platform that supports plugin-based extension. It uses a modern tech stack including NestJS (backend), React (frontend), Bun (JavaScript/TypeScript runtime), PostgreSQL (database), MikroORM (ORM), and Redis (caching).

## ✨ Key Features

- **🏢 Multi-Tenancy**: Isolated environments for different tenants with shared infrastructure
- **🧩 Plugin Architecture**: Extend functionality through dynamically loadable plugins
- **🔄 Dual API Support**: REST and GraphQL APIs with Swagger/OpenAPI documentation
- **🔐 Authentication & Authorization**: Secure JWT-based authentication with RBAC
- **📱 Responsive UI**: Modern user interface built with React and TypeScript
- **🌐 Internationalization**: Multi-language support and cultural/regional formatting
- **📊 Monitoring & Observability**: Structured logging with correlation IDs and health checks

## 🛠️ Technology Stack

- **Backend**: NestJS, TypeScript, MikroORM
- **Frontend**: React, TypeScript, Redux/Context API
- **Runtime**: Bun (Fast JavaScript/TypeScript runtime)
- **Database**: PostgreSQL
- **Caching**: Redis
- **Authentication**: JWT, Passport.js
- **API Documentation**: Swagger/OpenAPI
- **Containerization**: Docker, Docker Compose
- **CI/CD**: GitHub Actions, GitLab CI
- **Testing**: Jest, Testcontainers
- **Monitoring**: Prometheus, Grafana

## 📋 Prerequisites

- Bun >= 1.0.0
- Docker and Docker Compose
- Node.js >= 18.0.0 (for development tools)

## 🚀 Getting Started

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-org/acci-nest.git
cd acci-nest
```

2. Install dependencies:

```bash
bun install
```

3. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

### Development

Start the development environment:

```bash
# Start all services with Docker Compose
docker-compose up

# Or start services individually
bun run start:backend:dev
bun run start:frontend:dev
```

### Building for Production

```bash
bun run build
```

### Running Tests

The project uses Testcontainers for integration testing, which requires Docker to be running:

```bash
# Run all tests (unit, integration, e2e)
bun run test

# Run tests with coverage
bun run test:cov

# Run only integration tests
bun test --test-file-pattern "**/*.integration.spec.ts"

# Run only E2E tests
bun run test:e2e
```

## 🧪 Testing Strategy

### Integration Tests with Testcontainers

The project uses Testcontainers to run integration tests against real infrastructure components:

- **PostgreSQL Tests**: Test repositories and database interactions with real PostgreSQL instances
- **Redis Tests**: Test caching and messaging with real Redis instances
- **Combined Tests**: Test interactions between multiple infrastructure components

Testcontainers automatically starts and stops Docker containers for your tests, providing isolated, reproducible test environments.

Example of a PostgreSQL integration test:

```typescript
// Example of a repository integration test with Testcontainers
describe('UserRepository Integration Tests', () => {
  let pgContainer: StartedPostgreSqlContainer;
  let orm: MikroORM;
  let repository: UserRepository;

  beforeAll(async () => {
    // Start a PostgreSQL container
    pgContainer = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .start();
    
    // Initialize MikroORM with the container
    // Run tests...
  });

  afterAll(async () => {
    await orm.close();
    await pgContainer.stop();
  });

  // Test cases...
});
```

## 🔄 CI/CD Pipelines

The project includes CI/CD configurations for both GitHub Actions and GitLab CI:

### GitHub Actions

The GitHub Actions workflow runs on push to main/develop branches and pull requests:

- Runs linting and formatting checks
- Executes unit tests
- Runs integration tests with Testcontainers
- Executes E2E tests
- Generates coverage reports
- Builds the application

To view the workflow, check `.github/workflows/test.yml`.

### GitLab CI

The GitLab CI pipeline provides similar functionality:

- Multi-stage pipeline (test, build)
- Docker-in-Docker support for Testcontainers
- Test coverage reporting
- Artifact generation

To view the configuration, check `.gitlab-ci.yml`.

## 📂 Directory Structure

```
acci-nest/
├── docs/                    # Documentation files
│   ├── architecture/        # Architecture documents
│   ├── api/                 # API documentation
│   └── guides/              # Usage guides
├── src/
│   ├── backend/             # NestJS backend application
│   │   ├── auth/            # Authentication module
│   │   ├── user/            # User management module
│   │   ├── tenant/          # Tenant management module
│   │   └── plugin/          # Plugin system
│   ├── frontend/            # React frontend application
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   └── services/        # Frontend services
│   └── shared/              # Shared code between frontend and backend
├── tests/                   # Test files
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # End-to-end tests
├── deploy/                  # Deployment configurations
│   ├── docker-compose/      # Docker Compose files and Dockerfiles
│   └── scripts/             # Deployment scripts
├── .github/workflows/       # GitHub Actions workflows
├── .gitlab-ci.yml           # GitLab CI configuration
├── .env.example             # Example environment variables
├── docker-compose.yml       # Docker Compose configuration
├── package.json             # Project configuration
└── README.md                # Project documentation
```

## 🤝 Contributing

Please read the contribution guidelines before submitting pull requests.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👏 Acknowledgments

- NestJS - The framework used
- React - The frontend library
- MikroORM - The TypeScript ORM
- PostgreSQL - The database
- Docker - Containerization platform
- Testcontainers - Integration testing framework
