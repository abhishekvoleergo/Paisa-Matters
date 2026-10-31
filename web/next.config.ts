import type { NextConfig } from "next";

// Server-side proxy target (never exposed as NEXT_PUBLIC_*)
// Production: https://paisamatters-api.runasp.net/api
// Local fallback: http://localhost:5000/api
const proxyTarget =
  process.env.API_PROXY_TARGET?.trim() || "http://localhost:5000/api";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${proxyTarget.replace(/\/+$/, "")}/:path*`,
      },
    ];
  },
};

export default nextConfig;
