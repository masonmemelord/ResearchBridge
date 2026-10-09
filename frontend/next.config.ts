import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Agent instructions are maintained at the repository root, not generated here.
  agentRules: false,
  // The invite-request page was retired; old links and bookmarks go to sign-in.
  async redirects() {
    return [{ source: "/access", destination: "/sign-in", permanent: false }];
  },
  turbopack: {
    // Pin the root to this frontend project. Without it, Next.js infers the root
    // from the nearest lockfile and can pick one outside the repository.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
