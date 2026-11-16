import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next-build",
  // TypeScript is validated explicitly in CI/dev with `tsc --noEmit`.
  // Next's internal type-check worker cannot be spawned in the restricted
  // Windows/OneDrive environment and fails with EPERM during `next build`.
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 1,
    workerThreads: true,
  },
};

export default nextConfig;
