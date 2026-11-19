import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: ["*.trycloudflare.com"],
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
      allowedOrigins: [
        "*.trycloudflare.com",
        "localhost:3000",
        "127.0.0.1:3000",
      ],
    },
  },
  async rewrites() {
    const apiBase = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
    return [
      {
        source: "/media/:path*",
        destination: `${apiBase}/media/:path*`,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
