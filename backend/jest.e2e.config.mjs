import unitConfig from './jest.config.mjs';

export default {
  ...unitConfig,

  testMatch: [
    '<rootDir>/test/e2e/**/*.e2e-spec.ts',
  ],

  testTimeout: 30000,
};