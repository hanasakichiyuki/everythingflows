import type { Metadata, Viewport } from "next";
import {GeistSans} from "geist/font/sans";
import "./globals.css";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "zh_CN",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f4" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1b1e" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" suppressHydrationWarning className={`${GeistSans.className}`}>
      <head>
        {/*
          LXGW WenKai screen webfont — 异步加载，避免阻塞首屏渲染。
          该 CSS 含 97 个 @font-face（约 106KB），同步 <link> 会卡在关键渲染路径上。
          用一段内联脚本在解析时创建 <link> 并以 media="print" 下载，下完切回 all 应用；
          字体本身是 font-display: swap，文字先用系统字体显示，不会有不可见文字期。
          <noscript> 兜底：禁用 JS 时退回同步加载。
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='/fonts/lxgw-wenkai/lxgwwenkaiscreen.css';l.media='print';l.onload=function(){l.media='all'};document.head.appendChild(l);})();",
          }}
        />
        <noscript>
          {/* eslint-disable-next-line @next/next/no-css-tags */}
          <link rel="stylesheet" href="/fonts/lxgw-wenkai/lxgwwenkaiscreen.css" />
        </noscript>
        {/* 背景图预载，避免首屏背景晚到闪烁 */}
        <link
          rel="preload"
          as="image"
          href="/avatar/background.webp"
        />
      </head>
      <body suppressHydrationWarning className="font-sans">{children}</body>
    </html>
  );
}
