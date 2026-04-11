import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.ts', '**/*.{test,spec}.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/build/**'],
    // Run test files sequentially — several integration tests share the same
    // sample customer/products in the dev DB. Running them in parallel causes
    // FK races and order-of-cleanup flakes.
    fileParallelism: false,
    coverage: {
      reporter: ['text', 'html'],
      include: ['packages/*/src/**', 'apps/api/src/**'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/dist/**'],
    },
  },
});
