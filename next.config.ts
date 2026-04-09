import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {},
  // Railway Docker optimization
  output: "standalone",
  // Skip TS type check during build (Vercel 2-core timeout workaround)
  // Type checking still runs in dev and CI
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
