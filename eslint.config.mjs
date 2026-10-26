import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Design system guard (see DESIGN.md): app code styles with semantic tokens and
// src/components/ui, never with raw Tailwind palette colors, arbitrary colors or dark: variants.
const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white";
const UTILITIES =
  "bg|text|border|ring|fill|stroke|from|via|to|accent|outline|divide|decoration|caret|placeholder|shadow";
const BANNED = [
  [new RegExp(`(?<![\\w-])(?:${UTILITIES})(?:-[trblxyse])?-(?:${PALETTE})\\b`), "raw palette color"],
  [/(?<![\w-])dark:/, "dark: variant"],
  [/-\[(?:#|rgb|hsl|oklch|color-mix)/, "arbitrary color"],
];

const design = {
  rules: {
    "no-raw-colors": {
      meta: { type: "problem", schema: [] },
      create(context) {
        function check(node, text) {
          for (const [pattern, what] of BANNED) {
            const match = typeof text === "string" && text.match(pattern);
            if (match) {
              context.report({
                node,
                message: `"${match[0]}" is a ${what}. Use a design token or a src/components/ui component instead (see DESIGN.md).`,
              });
              return;
            }
          }
        }
        return {
          Literal: (node) => check(node, node.value),
          TemplateElement: (node) => check(node, node.value.cooked),
        };
      },
    },
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/app/**/*.{ts,tsx}"],
    plugins: { design },
    rules: { "design/no-raw-colors": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-e2e/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
