import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { sharedViteConfig } from "./vite.shared.ts";

export default defineConfig({
  ...sharedViteConfig,
  plugins: [react()],
});
