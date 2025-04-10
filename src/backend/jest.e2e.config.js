// E2E tests configuration
module.exports = {
  ...require('./jest.config'),
  testMatch: ['**/test/e2e/**/*.e2e-spec.ts'],
  testTimeout: 90000,
};
