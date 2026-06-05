import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // audio blobs for long recordings can be 10-20MB
    },
  },
};

export default nextConfig;
