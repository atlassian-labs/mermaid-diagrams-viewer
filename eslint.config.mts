import { defineConfig } from 'eslint/config';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import { includeIgnoreFile } from '@eslint/compat';
import eslint from '@eslint/js';
import pluginJest from 'eslint-plugin-jest';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import {
  projectStructureParser,
  projectStructurePlugin,
} from "eslint-plugin-project-structure";

const gitignorePath = fileURLToPath(
  new URL('.gitignore', import.meta.url),
);

const compat = new FlatCompat();

const workspaceStructure = [
  { name: "*" },
  {
    name: "src",
    children: [
      {
        name: "__tests__",
        children: [{ name: "*{kebab-case}.test.(ts|tsx)" }]
      },
      { name: "*{kebab-case}.(ts|tsx)" },
      {
        name: "*",  // Allows nested folders like 'confluence'
        children: [
          {
            name: "*",  // api-client, code-blocks, etc.
            children: [
              {
                name: "__tests__",
                children: [{ name: "*.test.(ts|tsx)" }]
              },
              { name: "*" }
            ]
          }
        ]
      }
    ]
  }
]

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  reactHooks.configs.flat['recommended-latest'],
  {
    languageOptions: { parser: projectStructureParser },
    plugins: {
      "project-structure": projectStructurePlugin,
    },
    rules: {
      "project-structure/folder-structure": [
        "error",
        {
          structure: [
            { name: "*" },
            {
              name: "app",
              children: workspaceStructure
            },
            {
              name: "custom-ui",
              children: workspaceStructure
            },
            {
              name: "shared",
              children: workspaceStructure
            }
          ]
        }
      ]
    }
  },
  compat.extends('plugin:n/recommended'),
  pluginJest.configs['flat/recommended'],
  tseslint.configs.recommended.map(config => ({
    files: ['**/*.ts', '**/*.tsx'],
    ...config,
  })),
  compat.extends('plugin:prettier/recommended'),
  {
    settings: {
      node: {
        tryExtensions: ['.ts', '.js', '.json', '.tsx', '.d.ts'],
        resolverConfig: {
          mainFiles: ['index', 'index.ts', 'index.js'],
        },
      },
    },

    rules: {
      'n/no-unsupported-features/es-syntax': 'off',
      'n/no-unpublished-import': 'off',
      'n/no-missing-import': [
        'error',
        {
          tryExtensions: ['.ts', '.js', '.json', '.tsx', '.d.ts'],
        },
      ],
      'jest/expect-expect': 'off',
      'jest/no-restricted-matchers': [
        'error',
        {
          toThrow: 'Use .toMatchError() instead of .toThrow()',
          toThrowError: 'Use .toMatchError() instead of .toThrowError()',
        },
      ],
      'no-empty-pattern': 'off',
      'no-console': 'error',
      'no-duplicate-imports': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: ['**/out/**', '**/dist/**'],
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        },
      ],
    },
  },
  {
    rules: {
      'no-console': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'jest/no-deprecated-functions': 'off',
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
      ignores: ['eslint.config.mts']
    }
  ]),
);
