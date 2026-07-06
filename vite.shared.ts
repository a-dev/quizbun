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
