import { defineConfig, mergeConfig } from 'vitest/config';
import { defineConfig as defineViteConfig } from 'vite';
import react from '@vitejs/plugin-react';
const viteConfig = defineViteConfig({
  plugins: [react()],
});

const vitestConfig = defineConfig({
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
