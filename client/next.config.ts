import type { NextConfig } from "next";

const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET || "https://smart-cli-based-agent.onrender.com";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "avatars.githubusercontent.com", // GitHub profile images
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
