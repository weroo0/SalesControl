import unitConfig from './jest.config.mjs';

export default {
  ...unitConfig,

  testMatch: [
    '<rootDir>/test/integration/**/*.spec.ts',
  ],

  testTimeout: 20000,
};
