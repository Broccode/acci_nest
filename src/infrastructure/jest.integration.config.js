// Integration tests configuration for infrastructure
module.exports = {
  ...require('./jest.config'),
  displayName: 'infrastructure-integration',
  testMatch: ['**/*.integration.spec.ts'],
  testTimeout: 60000,
};
