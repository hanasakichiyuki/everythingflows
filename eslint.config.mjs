import nextConfig from "eslint-config-next";

const eslintConfig = [
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
    },
  },
  {
    name: "everythingflows/global",
    rules: {
      "no-console": "warn",
    },
  },
];

export default eslintConfig;
