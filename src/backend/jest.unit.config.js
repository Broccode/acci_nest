// Unit tests configuration
module.exports = {
  ...require('./jest.config'),
  testMatch: ['**/*.spec.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/test/integration/',
    '/test/e2e/',
    '\\.integration\\.spec\\.ts$',
    '\\.e2e-spec\\.ts$',
  ],
};
