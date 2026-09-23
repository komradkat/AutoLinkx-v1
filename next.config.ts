import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// Pin the workspace root: a lockfile in a parent directory otherwise wins.
const projectRoot = dirname(fileURLToPath(import.meta.url));

const config: NextConfig = { output: 'standalone', poweredByHeader: false,
  turbopack: { root: projectRoot },
  /*
   * Hosts allowed to load dev resources. Next blocks every origin but
   * localhost by default, which silently stops React from starting when the
   * app is opened from another device on the network — the page renders but
   * nothing is interactive. Add the machine's LAN address to test on a phone.
   * Development only; it has no effect on a production build.
   */
  allowedDevOrigins: ['192.168.8.101'],
  async headers() { return [{ source: '/(.*)', headers: [
    {key:'X-Content-Type-Options',value:'nosniff'}, {key:'X-Frame-Options',value:'DENY'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'}] }]; }
};
export default config;
