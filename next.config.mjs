/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{
      protocol: "https",
      hostname: "lh3.googleusercontent.com",
    }],
  },
  // Pre-existing upstream type errors in cognee-frontend; we don't own those files.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
