# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project setup with multi-tenant architecture
- Backend structure with NestJS
- Frontend structure with React
- Docker Compose configuration for development environment
- PRD (Product Requirements Document) with approved status
- Architecture documentation with system diagrams and technical specifications
- Cursor rules for commit message conventions (semver-commit-agent)
- Cursor rules for changelog updates (changelog-update-agent)
- TypeScript best practices for NestJS development
- Project configuration files (.env.example, biome.json)
- Infrastructure setup with Docker Compose
- Project directory structure for backend and frontend
- Initial package configuration
- Project README with detailed documentation
- MIT License
- Additional cursor rules for architecture, testing, security, and API
- bun.lock file for dependency management
- MikroORM as an additional ORM option alongside TypeORM and Prisma
- Basic NestJS backend application setup (Module, Controller, Service, main.ts) (#1)
- `/health` check endpoint for backend (#1)
- E2E test setup for backend using Jest (#1)
- Initial `.env` configuration for backend (#1)
- MikroORM integration with PostgreSQL database (#2)
- Base entity model with UUID primary keys, created/updated timestamps (#2)
- Tenant entity model with multi-tenancy support (#2)
- Database migrations system with MikroORM CLI commands (#2)
- Enhanced health check endpoint with database connectivity status (#2)
- Extended E2E tests for database connectivity verification (#2)
- Advanced data access layer design with Repository Pattern (#3)
- Multi-tenancy support in Repository layer (#3)
- Database seeding system for development and testing (#3)
- Database connection optimization with connection pooling and retry mechanisms (#3)
- Comprehensive database health checks (#3)
- Story-3: Advanced Database Integration and Data Access Layer
  - Added `BaseRepository` with common data access methods
  - Implemented `TenantAwareRepository` for multi-tenant filtering
  - Created database seeders with configuration-based approach
  - Added comprehensive database health checks
  - Implemented proper error handling in database operations
  - Optimized PostgreSQL connections with pooling and retry mechanisms

### Changed

- Updated documentation rules for English language standards
- Enhanced workflow rules for agile development
- Improved architecture documentation template
- Extended .gitignore for better file exclusion
- Updated app.module.ts to include MikroORM configuration (#2)
- Updated PRD to reflect MikroORM as the exclusive ORM solution, replacing references to TypeORM/Prisma
- Added Bun and Biome to technology stack in PRD
- Updated Multi-Tenancy implementation examples in PRD to align with MikroORM patterns
- Reconfigured database connection for better performance and reliability
- Updated tenant data seeding to support external configuration files

### Fixed

- Resolved type-casting issues in repository classes by using proper TypeScript casting through `unknown`
- Improved error handling in TenantContext service with proper NestJS exceptions
- Fixed type safety issues in database repository implementation

### Completed

- Database Integration and ORM Setup story (Story 3) completed on 2025-04-01

## [0.2.0] - 2023-03-31

### Added

- Story-2: Docker Compose Development Environment
  - Added Docker Compose configuration for local development
  - Set up PostgreSQL database container with volume for persistence
  - Configured separate services for backend and frontend
  - Added health checks for all services
  - Implemented environment-based configuration

## [0.1.0] - 2023-03-24

### Added

- Story-1: Project Setup and Configuration
  - Created project structure with NestJS backend and React frontend
  - Added configuration management for different environments
  - Set up TypeScript compilation and ESLint for code quality
  - Added basic health check endpoint
  - Set up documentation structure

[Unreleased]: https://github.com/your-org/acci-nest/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/your-org/acci-nest/releases/tag/v0.1.0
