import { createDefaultEsmPreset } from 'ts-jest';

const preset = createDefaultEsmPreset({
  tsconfig: './tsconfig.json',
});

export default {
  ...preset,
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: [
    '<rootDir>/src/pago/pago.service.spec.ts',
    '<rootDir>/src/venta/venta.service.spec.ts',
   ],

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  clearMocks: true,
};
