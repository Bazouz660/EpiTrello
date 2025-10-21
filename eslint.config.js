import js from '@eslint/js';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginJsxA11y from 'eslint-plugin-jsx-a11y';
import pluginImport from 'eslint-plugin-import';
import pluginN from 'eslint-plugin-n';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

const ignores = [
  'node_modules',
  'dist',
  'coverage',
  'frontend/dist',
  'frontend/node_modules',
  'frontend/coverage',
  'backend/dist',
  'backend/node_modules',
  'backend/coverage',
];

export default [
  {
    ignores,
  },
  {
    files: ['frontend/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      react: pluginReact,
      'react-hooks': pluginReactHooks,
      'jsx-a11y': pluginJsxA11y,
      import: pluginImport,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...pluginReact.configs.flat.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      ...pluginJsxA11y.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'import/order': [
        'warn',
        {
          'newlines-between': 'always',
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['backend/**/*.{js,jsx}'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      n: pluginN,
      import: pluginImport,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...pluginN.configs['flat/recommended'].rules,
      'n/no-missing-import': 'off',
      'import/order': [
        'warn',
        {
          'newlines-between': 'always',
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  prettier,
];
