import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  distDir: process.env.SYDV_NEXT_DIST_DIR ?? ".next",
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.lhr.life",
    "*.localhost.run",
    "*.pinggy.link",
    "*.free.pinggy.link",
    "*.ngrok-free.app",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
      allowedOrigins: [
        "*.trycloudflare.com",
        "*.lhr.life",
        "*.localhost.run",
        "*.pinggy.link",
        "*.free.pinggy.link",
        "*.ngrok-free.app",
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
