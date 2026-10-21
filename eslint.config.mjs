import eslint from '@eslint/js';
import pluginImport from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    settings: {
      'import/extensions': ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
      'import/resolver': {
        node: {
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
        },
      },
    },
    plugins: {
      import: pluginImport,
    },
    rules: {
      'import/no-cycle': ['error', { ignoreExternal: true }],
      // Express 的错误处理中间件必须保留 4 个形参，用 _ 前缀表示有意不使用
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  globalIgnores([
    'dist/**',
    'dist-server/**',
    'node_modules/**',
    'scripts/**',
    // wrangler 本地模拟时生成的打包产物
    '.wrangler/**',
  ]),
]);
