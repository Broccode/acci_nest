// Root jest.config.js for infrastructure
module.exports = {
  displayName: 'infrastructure',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.spec\\.ts$', '\\.e2e-spec\\.ts$'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.(t|j)s',
    '!**/*.integration.spec.(t|j)s',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!index.ts',
    '!jest.config.js',
    '!tsconfig.json',
  ],
  coverageDirectory: './coverage',
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/../$1',
  },
  testTimeout: 30000,
};
