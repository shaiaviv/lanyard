import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for onnxruntime-web (Whisper) to use SharedArrayBuffer for multi-threaded inference
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
