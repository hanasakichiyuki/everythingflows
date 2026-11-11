import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep Playwright's production server isolated from a running local dev server.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",

  // 自托管部署产物：Next 会把运行时真正用到的 node_modules 裁剪进 .next/standalone，
  // 服务器上直接 `node server.js` 启动，无需 pnpm install / node_modules。
  //
  // Vercel 不支持 standalone —— 它有自家的 Next.js 适配层，直接读 .next/ 目录；
  // 而且 Next 16.3 上两者同时开启会让 Vercel 构建在 onBuildComplete 阶段报
  // ENOENT: .next/next-server.js.nft.json 而失败。Vercel 构建时会设置 VERCEL=1，
  // 因此这里按环境变量二选一，保证「Vercel 双跑 + CI 自托管构建」两条路都能走通。
  output: process.env.VERCEL ? undefined : "standalone",

  // 压缩交给 Nginx 处理（见 deploy/nginx/flows.conf）。
  // 两边同时开启会重复压缩、白耗 2 核 CPU。
  compress: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.hdslb.com" },
      { protocol: "https", hostname: "**.bilibili.com" },
      { protocol: "https", hostname: "**.mzstatic.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  experimental: {
    // 保留开发缓存，加快重复编译和开发服务重启。
    turbopackFileSystemCacheForDev: true,
  },
};

export default withNextIntl(nextConfig);
