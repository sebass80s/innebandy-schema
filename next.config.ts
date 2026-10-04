import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/innebandy-schema",
  assetPrefix: "/innebandy-schema/",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
