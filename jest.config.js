/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
    },
  },
  clearMocks: true,
  // Integration suites seed over the network (remote Neon Postgres) — the 5s
  // default trips on cross-region latency, not on real hangs.
  testTimeout: 30000,
  setupFiles: ['<rootDir>/tests/setup-env.ts'],
};
