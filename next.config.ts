import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// Pin the workspace root: a lockfile in a parent directory otherwise wins.
const projectRoot = dirname(fileURLToPath(import.meta.url));

const config: NextConfig = { output: 'standalone', poweredByHeader: false,
  turbopack: { root: projectRoot },
  async headers() { return [{ source: '/(.*)', headers: [
    {key:'X-Content-Type-Options',value:'nosniff'}, {key:'X-Frame-Options',value:'DENY'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'}] }]; }
};
export default config;
