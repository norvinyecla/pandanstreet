import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    setupFiles: ['./test/load-env.ts'],
    globalSetup: ['./test/global-setup.ts'],
    // Test files share one local test database, so run them one at a time.
    fileParallelism: false,
    include: ['**/*.e2e-spec.ts'],
  },
});
