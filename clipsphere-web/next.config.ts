import type { NextConfig } from "next";
import path from "path";

const backendInternalUrl =
  process.env.BACKEND_INTERNAL_URL || "http://localhost:5000";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname),
  experimental: {
    proxyClientMaxBodySize: "100mb",
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendInternalUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
