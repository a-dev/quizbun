import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import { patchCssModules } from "vite-css-modules";

export default defineConfig({
  resolve: {
    alias: {
      "#styles": fileURLToPath(new URL("./src/shared/styles", import.meta.url)),
    },
  },
  css: {
    modules: {
      localsConvention: "camelCaseOnly",
    },
  },
  plugins: [
    react(),
    patchCssModules({
      generateSourceTypes: true,
      declarationMap: true,
    }),
  ],
});
