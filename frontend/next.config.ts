import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    // The repo root also has a lockfile (backend), which confuses workspace-root
    // inference — pin the app root so dev/build don't warn and module resolution
    // stays scoped to the frontend.
    root: path.join(__dirname),
  },
};

export default nextConfig;
