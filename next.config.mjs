import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.hdslb.com" },
      { protocol: "https", hostname: "**.bilibili.com" },
      { protocol: "https", hostname: "**.mzstatic.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  experimental: {
    // 开发环境（next dev），先改为false方便vibe coding
    turbopackFileSystemCacheForDev: false,
  },
};

export default withNextIntl(nextConfig);
