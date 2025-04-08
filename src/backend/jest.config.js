module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.', // Relative to this file: src/backend
  // Look for tests ONLY within the src directory
  roots: ['<rootDir>/src'],
  // Match any .spec.ts file within the specified roots
  testRegex: '\\.spec\\.ts$',
  // Only ignore node_modules now, as roots handles the integration dir exclusion
  testPathIgnorePatterns: ['/node_modules/'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  // Consider adjusting coverage collection based on roots if needed
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  // Important for MikroORM - ensures all decorators are loaded correctly
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/../$1',
  },
  // Set a global timeout for all tests (30 seconds)
  testTimeout: 30000,
};
