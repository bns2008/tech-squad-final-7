import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // razorpay is a CommonJS package — bundle it server-side instead of
  // treating it as an external, which avoids ESM/CJS interop errors.
  serverExternalPackages: [],
};

export default nextConfig;
