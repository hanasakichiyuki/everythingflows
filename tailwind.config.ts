import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        sidebar: "var(--sidebar)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        border: "var(--border)",
      },
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "PingFang SC",
          "Microsoft YaHei",
          "system-ui",
          "sans-serif",
        ],
        serif: [
          '"LXGW WenKai Screen"',
          "PingFang SC",
          "serif",
        ],
        mono: [
          "var(--font-geist-mono)",
          "SFMono-Regular",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
