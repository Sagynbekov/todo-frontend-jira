import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,      // игнорировать ошибки ESLint при сборке :contentReference[oaicite:0]{index=0}
  },
  typescript: {
    ignoreBuildErrors: true,       // игнорировать ошибки TypeScript при сборке :contentReference[oaicite:1]{index=1}
  },
};

export default nextConfig;