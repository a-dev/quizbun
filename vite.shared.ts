import { fileURLToPath, URL } from "node:url";
import type { UserConfig } from "vite";

export const sharedViteConfig = {
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "#styles": fileURLToPath(new URL("./src/shared/styles", import.meta.url)),
      "#storybook": fileURLToPath(new URL(".storybook", import.meta.url)),
    },
  },
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: "camelCaseOnly",
    },
  },
} satisfies UserConfig;

// React Compiler auto-memoizes components and hooks. Every pipeline that
// renders islands (Astro, Storybook, the browser test lane) compiles the same
// way, so tests and stories exercise the code that ships.
export const reactCompiler = true;
