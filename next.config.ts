import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  experimental: { serverActions: { bodySizeLimit: "4.2mb" } },
};

export default nextConfig;
