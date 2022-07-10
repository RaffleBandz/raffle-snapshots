/*
👋 Defines eslint/tslint behavior for the project 💖
*/
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser', // 'babel-eslint'
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
    tsconfigRootDir: '.',
  },
  extends: [
    // 'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
  ],
  plugins: [
    '@typescript-eslint',
  ],
  env: {
    browser: true,
    node: true,
    jest: true,
  },
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx', '.js'],
    },
    'import/resolver': {
      // use <root>/tsconfig.json
      typescript: {
        // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
        alwaysTryTypes: true,
      },
    },
  },
  rules: {
    '@typescript-eslint/semi': ['error', 'always'],
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/space-before-function-paren': 'off',
    '@typescript-eslint/no-use-before-define': 'error',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/object-curly-spacing': ['error', 'always'],
    '@typescript-eslint/member-delimiter-style': ['error', { singleline: { delimiter: 'semi', requireLast: true } }],
    '@typescript-eslint/indent': ['error', 2, { SwitchCase: 1, ignoredNodes: ['JSXAttribute', 'JSXSpreadAttribute'] }],
    '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
    '@typescript-eslint/promise-function-async': 'off',
    '@typescript-eslint/no-floating-promises': 'off',
    '@typescript-eslint/restrict-template-expressions': 'off',
    '@typescript-eslint/strict-boolean-expressions': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        ignoreRestSiblings: true,
        argsIgnorePattern: 'res|next|^err|^_',
      },
    ],
    '@typescript-eslint/camelcase': 'off',
    'import/prefer-default-export': 'off',
    'import/first': 'error',
    'import/no-duplicates': 'error',
    'import/newline-after-import': 'error',
    'import/dynamic-import-chunkname': 'error',
    'import/no-dynamic-require': 'off',
    'import/no-unresolved': 'error',
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', ['parent', 'sibling'], ['index', 'object'], 'unknown'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc' },
        pathGroups: [
          { pattern: '@db/**', group: 'internal' },
          { pattern: '@libs/**', group: 'internal' },
          { pattern: '@config/**', group: 'internal' },
          { pattern: '@typings/**', group: 'internal' },
          { pattern: '@templates/**', group: 'internal' },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
      },
    ],
    semi: 'error',
    'no-undef': 'error',
    'no-debugger': 'off',
    'no-alert': 'off',
    'no-await-in-loop': 'off',
    'guard-for-in': 'off',
    'no-const-assign': 'error',
    'no-return-assign': [
      'error',
      'except-parens',
    ],
    'no-restricted-syntax': [
      'error',
      'LabeledStatement',
      'WithStatement',
    ],
    'no-unused-vars': 'off',
    'prefer-const': [
      'error',
      {
        destructuring: 'all',
      },
    ],
    indent: 'off',
    'arrow-parens': ['error', 'always'],
    'arrow-body-style': [
      'error',
      'as-needed',
    ],
    'no-unused-expressions': [
      'error',
      {
        allowTaggedTemplates: true,
        allowShortCircuit: true,
        allowTernary: true,
      },
    ],
    'no-param-reassign': [
      'error',
      {
        props: false,
      },
    ],
    'no-console': 'off',
    'func-names': 'off',
    'space-before-function-paren': 'off',
    'comma-dangle': ['error', 'always-multiline'],
    'max-len': [
      'error',
      {
        code: 160,
        ignoreComments: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
      },
    ],
    'no-underscore-dangle': 'off',
    'consistent-return': 'off',
    'no-nested-ternary': 'off',
    radix: 'off',
    'no-shadow': 'off',
    quotes: [
      'error',
      'single',
      {
        avoidEscape: true,
        allowTemplateLiterals: true,
      },
    ],
    'quote-props': [
      'error',
      'as-needed',
    ],
  },
  globals: {
    Promise: true,
  },
};
