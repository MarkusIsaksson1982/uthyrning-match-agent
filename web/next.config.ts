import type { NextConfig } from "next";

// The domain code in ../src is written for NodeNext ("./rules.js" imports of .ts files).
// extensionAlias lets webpack resolve those imports; outputFileTracingRoot keeps tracing inside the repo.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: new URL("..", import.meta.url).pathname,
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    return config;
  },
};

export default nextConfig;
