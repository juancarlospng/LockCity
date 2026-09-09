import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";
import a11y from "eslint-plugin-jsx-a11y";
export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  {
    files: [
      "app/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "lib/**/*.{ts,tsx}",
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { react, "react-hooks": hooks, "jsx-a11y": a11y },
    settings: { react: { version: "detect" } },
    rules: {
      ...hooks.configs.recommended.rules,
      ...a11y.configs.recommended.rules,
      "react/jsx-key": "error",
      "jsx-a11y/media-has-caption": "off",
    },
  },
];
