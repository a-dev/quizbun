import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { sharedViteConfig } from "./vite.shared";

export default defineConfig({
  ...sharedViteConfig,
  plugins: [react()],
});
