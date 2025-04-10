// Integration tests configuration
module.exports = {
  ...require('./jest.config'),
  testMatch: ['**/test/integration/**/*.integration.spec.ts'],
  testTimeout: 60000,
};
