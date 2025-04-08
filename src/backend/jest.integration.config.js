module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.', // Root relative to this config file, which is src/backend
  // Only match spec files within the test/integration directory
  testRegex: 'test/integration/.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  // No coverage collection for integration tests by default
  // collectCoverage: false,
  testEnvironment: 'node',
  // Important for MikroORM - ensures all decorators are loaded correctly
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1', // Adjust path relative to rootDir
  },
  // Set a global timeout for integration tests (e.g., 60 seconds)
  testTimeout: 60000,
};
