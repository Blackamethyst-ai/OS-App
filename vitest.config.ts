import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    testTimeout: 30000,
    hookTimeout: 30000,
    retry: 1,
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.spec.ts'],
      thresholds: {
        statements: 40,
        branches: 30,
        functions: 40,
        lines: 40,
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'libs': path.resolve(__dirname, 'libs'),
      '@metaventionsai/cpb-core': path.resolve(__dirname, 'libs/cpb-core/index.ts'),
      '@metaventionsai/voice-nexus': path.resolve(__dirname, 'libs/voice-nexus/index.ts'),
    }
  }
});
