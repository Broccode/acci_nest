# ACCI Nest - Architecture Overview

## System Context (C4 Model)

### Context Diagram

```
+----------------------------------+
|                                  |
|  ACCI Nest System                |
|                                  |
+----------------------------------+
          ^          ^
          |          |
          v          v
+-------------+  +-------------+
|             |  |             |
|   Users     |  |   Admins    |
|             |  |             |
+-------------+  +-------------+
          ^          ^
          |          |
          v          v
+----------------------------------+
|                                  |
|  External Services               |
|  (Email, Payment, Analytics)     |
|                                  |
+----------------------------------+
```

### Container Diagram

```
+------------------------------------------+
|  ACCI Nest System                        |
|                                          |
|  +---------------+  +---------------+    |
|  |               |  |               |    |
|  |  Frontend     |  |  Backend API  |    |
|  |  (React SPA)  |  |  (NestJS)     |    |
|  |               |  |               |    |
|  +---------------+  +---------------+    |
|          ^                  ^            |
|          |                  |            |
|          v                  v            |
|  +---------------+  +---------------+    |
|  |               |  |               |    |
|  |  Database     |  |  Plugin       |    |
|  |  (PostgreSQL) |  |  System       |    |
|  |               |  |               |    |
|  +---------------+  +---------------+    |
|                                          |
+------------------------------------------+
```

### Data Flow Diagram

```
User Request → Frontend → API Gateway → Auth Service → Business Logic → Database
                                    ↓                     ↑
                                Plugin System → Plugin Modules
```

## Architecture Principles

- **Domain-Driven Design**: Structuring the application according to business domains
- **Microservice-inspired Modularity**: Clear separation of responsibilities
- **Hexagonal Architecture**: Separation of business logic, adapters, and ports
- **CQRS Principles**: Separation of read and write operations where appropriate
- **Multi-Tenancy**: Isolation of customer data and resources
- **Plugin Architecture**: Extensibility through modular plugin components

## Main Components

- **Frontend**: React-based Single Page Application
- **Backend API**: NestJS-based REST/GraphQL API
- **Database**: PostgreSQL for persistent data storage
- **Plugin System**: Dynamically loadable extension modules
- **Auth System**: JWT-based authentication and authorization
- **Multi-Tenancy Layer**: Tenant isolation at all levels

## Deployment Structure

The application is distributed via Docker Compose as follows:

- Frontend Container
- Backend API Container (scalable)
- Database Container
- Redis for Caching (optional)
- Nginx as Reverse Proxy and for static assets

## Technology Stack

- **Frontend**: React, TypeScript, Redux/Context API
- **Backend**: NestJS, TypeScript, TypeORM
- **Database**: PostgreSQL
- **API Documentation**: Swagger/OpenAPI
- **Containerization**: Docker, Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus, Grafana
