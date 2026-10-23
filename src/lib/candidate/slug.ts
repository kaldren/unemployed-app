// Common spellings that should land on the same catalog entry.
const ALIASES: Record<string, string> = {
  reactjs: "react",
  "react-js": "react",
  nodejs: "node-js",
  node: "node-js",
  js: "javascript",
  ts: "typescript",
  nextjs: "next-js",
  vuejs: "vue",
  "vue-js": "vue",
  golang: "go",
  postgres: "postgresql",
  k8s: "kubernetes",
  "amazon-web-services": "aws",
  "google-cloud-platform": "gcp",
};

// "React.js", "react js" and "ReactJS" all become "react".
export function normalizeSlug(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\+/g, "-plus")
    .replace(/#/g, "-sharp")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ALIASES[slug] ?? slug;
}

// Trims and collapses whitespace so stored names look tidy.
export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}
