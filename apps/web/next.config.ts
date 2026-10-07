import type { NextConfig } from 'next';

const config: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@worldroot/contracts', '@worldroot/core', '@worldroot/db', '@worldroot/ui'],
  // Loaded by Node at runtime instead of being bundled: both carry native or WASM assets.
  serverExternalPackages: ['@electric-sql/pglite', 'pg'],
};

export default config;
