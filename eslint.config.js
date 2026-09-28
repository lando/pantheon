'use strict';

const eslint = require('@eslint/js');
const eslintConfigGoogle = require('eslint-config-google');
const babelEslintParser = require('@babel/eslint-parser');
const globals = require('globals');
const jsdoc = require('eslint-plugin-jsdoc');

module.exports = [
  eslint.configs.recommended,
  eslintConfigGoogle,
  jsdoc.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: babelEslintParser,
      parserOptions: {
        requireConfigFile: false,
      },
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
    },
    plugins: {
      jsdoc: jsdoc,
    },
    settings: {
      jsdoc: {
        // Match Lando core: @return, not @returns
        tagNamePreference: {returns: 'return'},
      },
    },
    rules: {
      'arrow-parens': ['error', 'as-needed'],
      'max-len': ['error', {
        code: 140,
        ignoreComments: true,
      }],
      'no-unused-vars': ['error', {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: false,
      }],
      // Existing recipe/service code predates google 0.14 indent/comma-dangle.
      'indent': 'off',
      'comma-dangle': 'off',
      // Deprecated in eslint 9; jsdoc/require-jsdoc below replaces it.
      'require-jsdoc': 'off',
      'valid-jsdoc': 'off',
      'jsdoc/require-jsdoc': ['error', {
        require: {
          FunctionDeclaration: true,
          MethodDefinition: false,
          ClassDeclaration: false,
          ArrowFunctionExpression: false,
          FunctionExpression: false,
        },
      }],
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns-description': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/tag-lines': 'off',
      'jsdoc/no-defaults': 'off',
      'jsdoc/check-tag-names': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-types': 'error',
      'jsdoc/valid-types': 'error',
    },
  },
  {
    ignores: [
      'temp/',
      'cache/',
      'dist/',
      '_site/',
      'docs/.vitepress/cache/',
      'docs/.vitepress/dist/',
      'coverage/',
      '.nyc_output/',
      'examples/*/drupal*/',
      'examples/*/wordpress/',
    ],
  },
];
