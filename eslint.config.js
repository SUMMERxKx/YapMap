// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    rules: {
      // A web/HTML rule. Apostrophes in React Native <Text> are plain characters.
      'react/no-unescaped-entities': 'off',
    },
  },
]);
