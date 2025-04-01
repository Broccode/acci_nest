# Bun Runtime Configuration

## Context

- Apply when developing, building, or running the application
- Use when modifying scripts or dependencies
- Reference when creating or updating Dockerfiles
- Follow when interacting with the JavaScript/TypeScript toolchain

## Critical Rules

- USE Bun as the JavaScript/TypeScript runtime instead of Node.js
- IMPLEMENT Bun-specific commands (`bun run`, `bunx`) in scripts
- LEVERAGE Bun's direct TypeScript execution capabilities
- CONFIGURE Dockerfiles with Bun base images
- OPTIMIZE application for Bun's runtime characteristics
- UPDATE environment variables to include BUN_ENV
- ADAPT testing infrastructure to use Bun's test runner
- MAINTAIN compatibility with Node.js APIs when possible
- USE Biome.js for linting and formatting instead of ESLint and Prettier

## Examples

<example>
// Running scripts with Bun
bun run start:dev

// Installing dependencies with Bun
bun install

// Using the Bun package runner
bunx mikro-orm migration:up

// Using Biome.js through Bun
bunx @biomejs/biome check --apply .

// Docker configuration
FROM oven/bun:1.0-alpine

// Package.json engine configuration
"engines": {
  "bun": ">=1.0.0"
}
</example>

<example type="invalid">
// Incorrect: Using npm instead of bun
npm install
npm run start

// Incorrect: Using ESLint or Prettier instead of Biome.js
eslint .
prettier --write .

// Incorrect: Missing BUN_ENV in Docker environment variables
environment:
  NODE_ENV: development
  
// Incorrect: Using Node.js base image
FROM node:18-alpine

// Incorrect: Using Node.js specific engine requirement
"engines": {
  "node": ">=16.0.0",
  "npm": ">=8.0.0"
}
</example>
