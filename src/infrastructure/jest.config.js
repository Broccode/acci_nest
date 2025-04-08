// src/infrastructure/jest.config.js
module.exports = {
  displayName: 'infrastructure', // Helps identify tests in output when running multiple projects
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.', // Relative to this file: src/infrastructure
  // Look for tests within the infrastructure directory itself
  roots: ['<rootDir>'],
  // Match any .spec.ts file, EXCLUDING .integration.spec.ts
  testRegex: '^(?!.*\\.integration\\.spec\\.ts$).*\\.spec\\.ts$',
  testPathIgnorePatterns: ['/node_modules/'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    // Collect coverage from all ts/js files in this directory, excluding test files, index, and config
    '**/*.(t|j)s',
    '!**/*.spec.(t|j)s',
    '!**/*.integration.spec.(t|j)s', // Exclude integration tests from unit coverage
    '!**/node_modules/**',
    '!**/vendor/**',
    '!index.ts', // Often just exports, adjust if it has logic
    '!jest.config.js',
    '!tsconfig.json',
  ],
  coverageDirectory: './coverage',
  // Set coverage thresholds to enforce 100% coverage (for unit tests)
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    // Bestehende Mappings beibehalten
    ...(module.exports?.moduleNameMapper || {}),
    // Hinzufügen des neuen Alias-Mappings
    '^@app/(.*)$': '<rootDir>/../$1',
  },
  testTimeout: 30000,
};
