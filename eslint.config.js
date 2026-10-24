import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const LETTERS = '/[A-Za-zА-Яа-яІіЇїЄєҐґ]/';
const TEXT_ATTRIBUTES = '/^(title|aria-label|placeholder|alt)$/';
const UI_TEXT_MESSAGE = 'User-facing text must come from t() (packages/i18n), not from a literal.';

const WEB_SRC = 'apps/web/src';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/generated/**',
      'apps/server/uploads/**',
      '**/playwright-report/**',
      '.specify/**',
      '.claude/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: false, requireDefaultForNonUnion: true },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['scripts/**', 'apps/server/prisma/seed/**'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['apps/server/src/public/js/**'],
    languageOptions: { globals: globals.browser, sourceType: 'script' },
  },
  {
    // Test responses (supertest, MSW) are untyped JSON; assertions check their shape.
    files: ['**/tests/**', '**/__tests__/**'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  {
    files: [`${WEB_SRC}/**/*.{ts,tsx}`],
    languageOptions: { globals: globals.browser },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      boundaries,
    },
    settings: {
      'import/resolver': { typescript: { project: 'apps/web/tsconfig.json' } },
      'boundaries/include': [`${WEB_SRC}/**/*`],
      'boundaries/elements': [
        {
          type: 'feature',
          pattern: `${WEB_SRC}/features/*`,
          partialMatch: false,
          capture: ['feature'],
        },
        { type: 'shared', pattern: `${WEB_SRC}/shared`, partialMatch: false },
        { type: 'types', pattern: `${WEB_SRC}/types`, partialMatch: false },
        { type: 'app', pattern: WEB_SRC, partialMatch: false },
      ],
      // Guideline §2.1: files directly under features/<name>/ are the public surface of a feature;
      // anything nested deeper is private to it.
      'boundaries/files': [{ category: 'public', pattern: `${WEB_SRC}/features/*/*.{ts,tsx}` }],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            { allow: { to: { module: { origin: 'external' } } } },
            {
              from: { element: { type: 'app' } },
              allow: { to: { element: { types: { anyOf: ['app', 'shared', 'types'] } } } },
            },
            {
              from: { element: { types: { anyOf: ['app', 'feature'] } } },
              allow: { to: { element: { type: 'feature' }, file: { categories: 'public' } } },
            },
            {
              from: { element: { type: 'feature' } },
              allow: { to: { element: { types: { anyOf: ['shared', 'types'] } } } },
            },
            {
              from: { element: { type: 'feature' } },
              allow: {
                to: {
                  element: {
                    type: 'feature',
                    captured: { feature: '{{ from.element.captured.feature }}' },
                  },
                },
              },
            },
            {
              from: { element: { type: 'shared' } },
              allow: { to: { element: { types: { anyOf: ['shared', 'types'] } } } },
            },
            {
              from: { element: { type: 'types' } },
              allow: { to: { element: { type: 'types' } } },
            },
          ],
        },
      ],
    },
  },
  {
    files: [`${WEB_SRC}/**/*.tsx`],
    ignores: [`${WEB_SRC}/**/__tests__/**`, `${WEB_SRC}/shared/test/**`],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: `JSXText[value=${LETTERS}]`, message: UI_TEXT_MESSAGE },
        {
          selector: `JSXAttribute[name.name=${TEXT_ATTRIBUTES}] > Literal[value=${LETTERS}]`,
          message: UI_TEXT_MESSAGE,
        },
      ],
    },
  },
);
