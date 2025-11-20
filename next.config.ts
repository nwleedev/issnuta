import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  register: true,
  cacheOnNavigation: true,
  // scope: "/", // 필요 시 스코프 지정
});

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
};

const isProd = process.env.NODE_ENV === "production";
export default isProd ? withSerwist(nextConfig) : nextConfig;
