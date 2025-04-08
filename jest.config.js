module.exports = {
  projects: ['<rootDir>/src/backend/jest.config.js'],
  moduleNameMapper: {
    ...(module.exports?.moduleNameMapper || {}),
    '^@app/(.*)$': '<rootDir>/src/$1',
  },
};
