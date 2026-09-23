import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import vue from 'eslint-plugin-vue';

export default [
  { ignores: ['**/dist/**', '**/.nuxt/**', '**/.output/**', '**/node_modules/**', '**/coverage/**', 'packages/database/src/generated/**'] },
  {
    ...js.configs.recommended,
    files: ['**/*.{js,mjs,cjs,ts,tsx,vue}'],
    rules: { ...js.configs.recommended.rules, 'no-undef': 'off' },
  },
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: ['**/*.{ts,tsx}'] })),
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
    rules: { 'no-undef': 'off' },
  },
  {
    files: ['apps/web/pages/**/*.vue', 'apps/web/layouts/**/*.vue'],
    rules: { 'vue/multi-word-component-names': 'off' },
  },
  {
    files: ['**/*.{ts,tsx,vue}'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
