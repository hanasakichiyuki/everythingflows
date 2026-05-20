import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.hdslb.com" },
      { protocol: "https", hostname: "**.bilibili.com" },
      { protocol: "https", hostname: "**.mzstatic.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
