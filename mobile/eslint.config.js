// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Core code must stay plain TypeScript so Node scripts can share it.
    files: ['src/core/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['react', 'react-native', 'react-native-*', 'expo', 'expo-*', '@expo/*', '@/*'] },
      ],
    },
  },
]);
