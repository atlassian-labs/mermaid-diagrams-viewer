import { defineConfig, mergeConfig } from 'vite';
import { defineConfig as defineVitestConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const viteConfig = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      shared: path.resolve(__dirname, '../shared'),
    },
  },
});

const vitestConfig = defineVitestConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setup-tests.ts',
    // Test reporting
    reporters: process.env.CI ? ['verbose', 'junit'] : ['verbose'],
    outputFile: process.env.CI
      ? '../test-results/custom-ui-junit.xml'
      : undefined,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/__tests__/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/setup-tests.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'vite.config.ts',
        'vitest.config.ts',
        '**/*.config.*',
        '**/*.d.ts',
      ],
      thresholds: {
        global: {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
      },
    },
  },
});

export default mergeConfig(viteConfig, vitestConfig);
