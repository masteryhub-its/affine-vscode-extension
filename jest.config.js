/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/**/*.d.ts', '!src/extension.ts', '!src/vscode/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: { global: { lines: 90, statements: 90, functions: 92, branches: 78 } },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
};
