import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {},
  // Railway Docker optimization
  output: "standalone",
  // Skip TS type check during build (Vercel 2-core timeout workaround)
  // Type checking still runs in dev and CI
  typescript: {
    ignoreBuildErrors: true,
  },
  // Silence "inferred workspace root" warning from parent package-lock.json
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
