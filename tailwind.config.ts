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
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          soft: "var(--primary-soft)",
        },
        ring: "var(--ring)",
        surface: {
          DEFAULT: "var(--surface)",
          overlay: "var(--surface-overlay)",
          border: "var(--surface-border)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
      },
      borderRadius: {
        surface: "var(--radius)",
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
