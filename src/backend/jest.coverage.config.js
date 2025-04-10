// Combined coverage configuration for unit and integration tests
module.exports = {
  ...require('./jest.config'),
  // Alle Tests ausführen, sowohl unit als auch integration
  testMatch: ['**/*.spec.ts', '**/test/integration/**/*.integration.spec.ts'],
  // E2E-Tests ausschließen
  testPathIgnorePatterns: [
    '/node_modules/',
    '/test/e2e/',
    '\\.e2e-spec\\.ts$'
  ],
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.e2e-spec.ts',
    '!src/**/*.mock.ts',
    '!src/**/index.ts'
  ],
  // Lange Tests brauchen mehr Zeit
  testTimeout: 60000,
  // Für Integrationstests nötige Parameter
  testEnvironment: 'node',
  detectOpenHandles: true,
  forceExit: true,
  
  // Testcontainers Integration benötigt spezielle Einstellungen für die Umgebung
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  
  // Transformers richtig konfigurieren
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      isolatedModules: true
    }]
  }
}; 