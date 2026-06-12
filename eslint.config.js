import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['dist/**', 'node_modules/**', 'docs/**', '*.html', '.kanbots/**'],
  },
  // Base: TypeScript recommended
  ...tseslint.configs.recommended,
  // React + browser files
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    rules: {
      // typescript-eslint tuning
      '@typescript-eslint/no-explicit-any': 'warn',       // 既存コードにanyが多いため warn に格下げ
      '@typescript-eslint/no-unused-vars': ['error', {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: true,
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],

      // react-hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',              // 既存コードの依存配列不完全を warn に格下げ

      // react-refresh (Vite HMR)
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  // Node/config files
  {
    files: ['vite.config.ts', 'eslint.config.js', 'vitest.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
);
