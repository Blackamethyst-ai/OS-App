import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.spec.ts']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'libs': path.resolve(__dirname, 'libs'),
    }
  }
});
