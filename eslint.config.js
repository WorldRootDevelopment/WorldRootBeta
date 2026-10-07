import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const boundary = (patterns, message) => ({
  'no-restricted-imports': ['error', { patterns: [{ group: patterns, message }] }],
});

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/migrations/**', '**/next-env.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  // Apps reach the database only through core services.
  {
    files: ['apps/**/*.{ts,tsx}'],
    rules: boundary(['@worldroot/db', '@worldroot/db/*'], 'Apps call @worldroot/core services, never the database package.'),
  },
  // contracts and ui must stay safe to ship to the browser.
  {
    files: ['packages/contracts/**/*.ts', 'packages/ui/**/*.{ts,tsx}'],
    rules: boundary(
      ['@worldroot/db', '@worldroot/db/*', '@worldroot/core', '@worldroot/core/*'],
      'contracts and ui import nothing from core or db.',
    ),
  },
);
