import { FlatCompat } from "@eslint/eslintrc";
import query from "@tanstack/eslint-plugin-query";
import globals from "globals";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    plugins: {
      "@tanstack/query": query,
    },
    rules: {
      "@tanstack/query/exhaustive-deps": "error",
    },
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  // Global rules
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      // 허용: 설명이 있는 경우에만 ts-ignore 사용
      "@typescript-eslint/ban-ts-comment": [
        "warn",
        { "ts-ignore": "allow-with-description" },
      ],
    },
  },
  // Service Worker context (self, clients 등 글로벌)
  {
    files: ["app/sw.ts", "src/sw/**/*.ts"],
    languageOptions: {
      globals: globals.serviceworker,
    },
  },
];

export default eslintConfig;
