import type { NextConfig } from "next";

const legacyHosts = ["comparavy.com", "www.comparavy.com", "www.ateflo.com"];

const nextConfig: NextConfig = {
  async redirects() {
    return legacyHosts.map((host) => ({
      source: "/:path*",
      has: [
        {
          type: "host",
          value: host,
        },
      ],
      destination: "https://ateflo.com/:path*",
      permanent: true,
    }));
  },
};

export default nextConfig;
