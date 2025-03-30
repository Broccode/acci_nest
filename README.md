# ACCI Nest

Multi-tenant, plugin-extensible platform built with NestJS and React using Bun runtime.

## Overview

ACCI Nest is a scalable, multi-tenant application platform that supports plugin-based extension. It uses a modern tech stack including NestJS (backend), React (frontend), Bun (JavaScript/TypeScript runtime), PostgreSQL (database), and Redis (caching).

## Features

- **Multi-tenancy**: Isolated environments for different tenants
- **Plugin Architecture**: Extend functionality through plugins
- **RESTful API**: Well-documented API with Swagger integration
- **Authentication & Authorization**: Secure JWT-based authentication
- **Real-time Communication**: WebSocket support for real-time features
- **Responsive UI**: Modern user interface built with React

## Technology Stack

- **Backend**: NestJS (TypeScript)
- **Frontend**: React (TypeScript)
- **Runtime**: Bun (Fast JavaScript/TypeScript runtime)
- **Database**: PostgreSQL
- **Caching**: Redis
- **Authentication**: JWT, Passport
- **API Documentation**: Swagger/OpenAPI
- **Containerization**: Docker, Docker Compose

## Prerequisites

- Bun >= 1.0.0
- Docker and Docker Compose
- PostgreSQL 14+
- Redis 7+

## Getting Started

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

3. Create a `.env` file based on the `.env.example`:

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

## Directory Structure

```
acci-nest/
├── docs/                    # Documentation files
│   ├── architecture/        # Architecture documents
│   ├── api/                 # API documentation
│   └── guides/              # Usage guides
├── src/
│   ├── backend/             # NestJS backend application
│   ├── frontend/            # React frontend application
│   └── shared/              # Shared code between frontend and backend
├── tests/                   # Test files
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # End-to-end tests
├── deploy/                  # Deployment configurations
│   ├── docker-compose/      # Docker Compose files and Dockerfiles
│   └── scripts/             # Deployment scripts
├── .env.example             # Example environment variables
├── docker-compose.yml       # Docker Compose configuration
├── package.json             # Project configuration
└── README.md                # Project documentation
```

## Contributing

Please read the contribution guidelines before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- NestJS - The framework used
- React - The frontend library
- PostgreSQL - The database
- Docker - Containerization platform
