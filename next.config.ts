/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // ✅ Backend API (production)
      {
        source: "/api/:path*",
        destination: "http://localhost:8080/:path*",
      },

      // ✅ uploads proxy (IMPORTANT)
      {
        source: "/uploads/:path*",
        destination: "http://localhost:8080/uploads/:path*",
      },
    ];
  },

  images: {
    remotePatterns: [
      // Existing
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "sendbird.imgix.net", pathname: "/**" },

      // ✅ Your hosted backend uploads
      { protocol: "https", hostname: "tokbox.nl", pathname: "/uploads/**" },
    ],
  },
};

module.exports = nextConfig;
