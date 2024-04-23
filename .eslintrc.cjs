module.exports = {
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  extends: ['eslint:recommended', 'plugin:jsdoc/recommended', 'prettier'],
  plugins: ['jsdoc', 'prettier'],
  rules: {
    'jsdoc/check-param-names': 'warn',
    'jsdoc/check-tag-names': 'warn',
    'jsdoc/check-types': 'warn',
    'jsdoc/require-param': 'warn',
    'jsdoc/require-param-type': 'warn',
    'jsdoc/require-returns': 'warn',
    'jsdoc/require-returns-type': 'warn',
    'prettier/prettier': 'error'
  },
  env: {
    es2021: true,
    node: true,
    browser: true
  }
};
