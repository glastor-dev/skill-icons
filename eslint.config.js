const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');

module.exports = [
  {
    ignores: ['dist/**', 'icons/**', 'node_modules/**'],
  },
  js.configs.recommended,
  prettier,
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
      },
    },
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
        addEventListener: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        URL: 'readonly',
        crypto: 'readonly',
        TextEncoder: 'readonly',
        console: 'readonly',

        // Optional Worker bindings (secrets/vars)
        SVGS_API_KEY: 'readonly',
        LOG_SAMPLE_RATE: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
    },
  },
];
