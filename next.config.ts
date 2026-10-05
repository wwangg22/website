import type { NextConfig } from "next";

// Large media is served from the Media bucket at /media in production. In dev,
// set MEDIA_ORIGIN (in .env.development.local) to proxy /media to the deployed site.
const mediaOrigin = process.env.MEDIA_ORIGIN;

const nextConfig: NextConfig = {
  async rewrites() {
    return mediaOrigin ? [{ source: "/media/:path*", destination: `${mediaOrigin}/media/:path*` }] : [];
  },
};

export default nextConfig;
