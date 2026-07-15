// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import react from "@astrojs/react";
import sitemap from '@astrojs/sitemap';
import { patchCssModules } from "vite-css-modules";
import { loadEnv } from "vite";


import { sharedViteConfig } from "./vite.shared.ts";


const githubPagesBase = "/quizbun";
const githubPagesSite = `https://a-dev.github.io${githubPagesBase}`;

const { ALLOWED_HOSTS = "", GITHUB_PAGES } = loadEnv(
  process.env.NODE_ENV ?? "development",
  process.cwd(),
  "",
);
const allowedHosts = ALLOWED_HOSTS.split(",")
  .map((host) => host.trim())
  .filter(Boolean);

export default defineConfig({
  base: GITHUB_PAGES === "true" ? githubPagesBase : "/",
  server: {
    allowedHosts,
  },
  integrations: [react(), sitemap()],
  output: "static",
  site: githubPagesSite,
  vite: {
    ...sharedViteConfig,
    plugins: [
      patchCssModules({
        generateSourceTypes: true,
        declarationMap: true,
      }),
    ],
    optimizeDeps: {
      include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
    },
  },

  fonts: [
    {
      provider: fontProviders.google(),
      name: "Noto Sans",
      cssVariable: "--font-noto-sans",
      weights: ["100 900"],
      subsets: ["latin"],
      styles: ["normal", "italic"],
    },
    {
      provider: fontProviders.google(),
      name: "Noto Sans Mono",
      cssVariable: "--font-noto-mono",
      weights: ["100 900"],
      subsets: ["latin"],
    },
  ],
});
