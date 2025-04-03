module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  // Important for MikroORM - ensures all decorators are loaded correctly
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  // Set a global timeout for all tests (30 seconds)
  testTimeout: 30000,
};
