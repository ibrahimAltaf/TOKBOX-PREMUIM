import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "sendbird.imgix.net" }],
  },
};

export default nextConfig;
