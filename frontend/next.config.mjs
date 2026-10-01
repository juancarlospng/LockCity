/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    localPatterns: [{ pathname: "/store/media" }],
  },
  outputFileTracingRoot: new URL(".", import.meta.url).pathname,
  allowedDevOrigins: [
    "*.preview.emergentagent.com",
    "*.preview.emergentcf.cloud",
  ],
};

export default nextConfig;
