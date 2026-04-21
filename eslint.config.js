import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "build",
      "node_modules",
      "drizzle",
      "apps",
      "packages",
      "scripts",
      "*.config.js",
      "*.config.ts",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // ── Violations from 1Commerce static audit ──────────────────────────
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "no-unused-vars": "off",

      // Null safety: flag non-null assertions on DOM queries.
      // Disabled project-wide — heavily used in tRPC data handlers where the
      // shape is narrowed by tRPC's inferred output types. Re-enable per-file
      // with /* eslint-disable */ where null safety matters (e.g. DOM queries).
      "@typescript-eslint/no-non-null-assertion": "off",

      // Identical branches / constant conditions
      "no-constant-condition": ["error", { checkLoops: false }],

      // React hooks correctness — must stay strict; effect dependency bugs
      // are real runtime issues. Genuine exceptions should be marked with
      // an eslint-disable-next-line comment explaining the rationale.
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      // ── General quality ───────────────────────────────────────────────
      // Disabled project-wide — `any` is pragmatic for tRPC payloads, Supabase
      // Realtime events, and 3rd-party SDK types (PayPal, Square, Google Maps)
      // where the upstream type surfaces are incomplete. Prefer `unknown`
      // where practical in new code.
      "@typescript-eslint/no-explicit-any": "off",
      "prefer-const": "error",
      "no-var": "error",
      // NOTE: no-floating-promises and no-misused-promises require typed linting
      // (parserOptions.project) — enable separately in CI with: eslint --rule typed
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/__tests__/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  }
);
