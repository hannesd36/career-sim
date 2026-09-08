import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/**
 * The rules the pipeline enforces.
 *
 * Two things this config deliberately does not do. It does not format: every
 * stylistic rule is switched off by `prettier` at the end of the chain, so
 * there is exactly one tool with an opinion about where the line breaks go.
 * And it does not use type-aware linting, which would want a second full
 * TypeScript pass on every run; `tsc --noEmit` already does that in its own
 * CI step, so paying for it twice buys nothing.
 */
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'server/.wrangler', 'public/players.json'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // Vite's fast refresh only works when a module exports components and
      // nothing else. A warning rather than an error: some of these files
      // deliberately export a helper next to the component.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // An unused name is nearly always a leftover, but an argument that only
      // exists to reach the one after it is fine, and so is a deliberate _.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],

      // `any` switches type checking off exactly where it is usually needed.
      '@typescript-eslint/no-explicit-any': 'error',

      // The engine asserts non-null in places where a check has already been
      // made a line earlier; the alternative is noise, not safety.
      '@typescript-eslint/no-non-null-assertion': 'off',

      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Scripts run in Node, not in a browser, and are allowed to talk to a console.
  {
    files: ['scripts/**/*.{js,mjs,ts}', '*.config.{js,ts}', 'server/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },

  // The service worker is neither: it has its own global scope, with `self`,
  // `caches` and `clients` in it and no window anywhere.
  {
    files: ['public/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker, ...globals.browser } },
  },

  /*
   * Known debt, deliberately visible.
   *
   * These fire on game screens written before the linter existed: a few effects
   * that set state synchronously, and a few refs read during render. They are
   * real findings and worth fixing, but fixing them means changing how those
   * screens behave, which is not something to do blind in the same change that
   * introduces the linter. Warnings keep them in every run's output instead of
   * hiding them behind a disable comment.
   */
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },

  // Tests reach for internals and log when they are being debugged.
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-console': 'off' },
  },

  // Last, so it wins: turns off everything Prettier owns.
  prettier,
)
