import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    // Pin the root to this frontend project. Without it, Next.js infers the root
    // from the nearest lockfile and can pick one outside the repository.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
