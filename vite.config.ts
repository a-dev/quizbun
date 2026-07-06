// Used only by the `css:dts` script (vite-css-modules CLI), which cannot read
// the inline Vite config inside astro.config.mjs.
import { defineConfig } from "vite";
import { patchCssModules } from "vite-css-modules";
import { sharedViteConfig } from "./vite.shared";

export default defineConfig({
  ...sharedViteConfig,
  plugins: [patchCssModules({ generateSourceTypes: true, declarationMap: true })],
});
