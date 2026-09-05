import type { NextConfig } from 'next';
const config: NextConfig = { output: 'export', poweredByHeader: false, images: { unoptimized: true }, turbopack: { root: process.cwd() } };
export default config;
