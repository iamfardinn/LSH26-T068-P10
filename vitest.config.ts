import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// Kept as a separate file from vite.config.ts on purpose: vite.config.ts
// must type-check standalone under `tsc -b` as part of `npm run build`,
// and Vite's own `defineConfig` type does not know about Vitest's `test`
// key. Merging here keeps the dev/build plugin config in one place while
// giving Vitest its own config surface.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // legacy-vanilla-js/test/* is a separate, self-contained CommonJS
      // test suite for the pre-migration build (run standalone via
      // `node legacy-vanilla-js/test/run-tests.js`), not a Vitest suite.
      exclude: ['**/node_modules/**', '**/legacy-vanilla-js/**'],
    },
  })
);
