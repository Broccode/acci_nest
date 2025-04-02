module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  // Wichtig für MikroORM - stellt sicher, dass alle Decorators korrekt geladen werden
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
  },
}; 