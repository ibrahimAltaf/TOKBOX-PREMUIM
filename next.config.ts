/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ REST API ko same-origin bana do => cookies reliably work
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8080/:path*",
      },
    ];
  },

  // ✅ Unsplash images allow (Next/Image 404 fix)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "sendbird.imgix.net", pathname: "/**" },
    ],
  },
};

module.exports = nextConfig;
