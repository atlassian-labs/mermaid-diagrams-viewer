import eslint from '@eslint/js';
import atlassian from '@atlassian/eslint-config-xen';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';
import { includeIgnoreFile } from '@eslint/compat';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const gitignorePath = fileURLToPath(
  new URL('.gitignore', import.meta.url),
);

export default tseslint.config(
  eslint.configs.recommended,
  atlassian.config,
  reactHooks.configs['recommended-latest'],
  tseslint.configs.strictTypeChecked,
  {
    rules: {
      'no-console': 'warn',
      'react-hooks/rules-of-hooks': 'error',
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: dirname(import.meta.dirname),
        sourceType: 'module',
        ecmaVersion: 2020,
      },
    },
  },
  defineConfig([
    includeIgnoreFile(gitignorePath),
    {
      ignores: ['eslint.config.mjs']
    }
  ]),
);
