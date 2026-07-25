import nextConfig from "eslint-config-next";
import { globalIgnores } from "eslint/config";

const eslintConfig = [
  globalIgnores(["public/libs/APlayer.min.js"]),
  ...nextConfig,
  {
    name: "everythingflows/typescript-extra",
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/consistent-type-imports": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn",
      // Existing player integrations expose refs as component props; this rule
      // cannot distinguish those safe ref-prop uses from render-time reads.
      "react-hooks/refs": "warn",
    },
  },
  {
    name: "everythingflows/global",
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    name: "everythingflows/scripts",
    files: ["scripts/**/*.mjs"],
    rules: {
      "no-console": "off",
    },
  },
];

export default eslintConfig;
