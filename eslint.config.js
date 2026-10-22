// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const security = require('eslint-plugin-security');

module.exports = defineConfig([
  expoConfig,
  // Flags risky patterns such as eval, unsafe regular expressions and child_process calls.
  security.configs.recommended,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    rules: {
      // A web/HTML rule. Apostrophes in React Native <Text> are plain characters.
      'react/no-unescaped-entities': 'off',
      // Flags every `object[key]`, which TypeScript already checks; too noisy to be useful.
      'security/detect-object-injection': 'off',
    },
  },
]);
