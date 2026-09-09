import { fileURLToPath } from 'node:url';
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
  allowedDevOrigins: [
    "*.preview.emergentagent.com",
    "*.preview.emergentcf.cloud",
  ],
};

export default nextConfig;
