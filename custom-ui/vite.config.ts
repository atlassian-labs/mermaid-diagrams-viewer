import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react()],
  resolve: {
    alias:
      mode === 'development'
        ? {
            // Swap @forge/bridge for a local mock so the app runs without a
            // real Confluence instance.  Edit src/dev/forge-bridge-mock.ts to
            // change the simulated context or page content.
            '@forge/bridge': path.resolve(
              import.meta.dirname,
              'src/dev/forge-bridge-mock.ts',
            ),
          }
        : {},
  },
  build: {
    outDir: '../app/build/custom-ui',
    emptyOutDir: true,
  },
}));
