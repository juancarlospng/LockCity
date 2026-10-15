/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    localPatterns: [{ pathname: "/store/media" }, { pathname: "/images/**" }],
    qualities: [70, 75, 82, 86, 88, 90],
  },
  outputFileTracingRoot: new URL(".", import.meta.url).pathname,
  allowedDevOrigins: [
    "*.preview.emergentagent.com",
    "*.preview.emergentcf.cloud",
  ],
};

export default nextConfig;
