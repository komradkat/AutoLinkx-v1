import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import type { UserConfig } from 'vitest/config';

// Next resolves `server-only` to an empty module under the react-server
// condition; plain Node resolves it to the guard that throws on import. Point
// it at the same empty module so server modules stay testable.
const serverOnlyStub = fileURLToPath(new URL('node_modules/server-only/empty.js', import.meta.url));
const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  // Integration tests read local Supabase values from .env.local, which is
  // git-ignored. Unit tests do not depend on any of this.
  Object.assign(process.env, loadEnv(mode, projectRoot, ''));

  return {
    resolve: {
      alias: {
        'server-only': serverOnlyStub,
        '@': fileURLToPath(new URL('src', import.meta.url)),
      },
    },
  } satisfies UserConfig;
});
