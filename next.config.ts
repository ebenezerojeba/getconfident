import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera/microphone only for this origin (needed for recording).
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Lets verification builds (e.g. E2E) run alongside `next dev` without
  // both writing to the same .next directory.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  serverExternalPackages: ["@node-rs/argon2"],
  // Brand font files read at runtime by next/og image routes.
  outputFileTracingIncludes: {
    "/api/sessions/[id]/share-card": ["./src/assets/fonts/*.woff"],
    "/opengraph-image*": ["./src/assets/fonts/*.woff"],
    "/twitter-image*": ["./src/assets/fonts/*.woff"],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
