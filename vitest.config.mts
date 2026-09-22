import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Next resolves `server-only` to an empty module under the react-server
// condition; plain Node resolves it to the guard that throws on import. Point
// it at the same empty module so server modules stay testable.
const serverOnlyStub = fileURLToPath(new URL('node_modules/server-only/empty.js', import.meta.url));

export default defineConfig({
  resolve: { alias: { 'server-only': serverOnlyStub } },
});
