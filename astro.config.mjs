// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { DevTools } from "@vitejs/devtools";
import { patchCssModules } from "vite-css-modules";
import { loadEnv } from "vite";

import { sharedViteConfig } from "./vite.shared.ts";
import { quizAssets } from "./astro-quiz-assets.ts";

const devtoolsBuild = process.env.DEVTOOLS === "true";

const { ALLOWED_HOSTS = "" } = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
const allowedHosts = ALLOWED_HOSTS.split(",")
  .map((host) => host.trim())
  .filter(Boolean);

// Duplicates (`/quizzes/page/1/` canonicals to
// `/quizzes/`) and the two device-local Library shells have nothing to index.
const excludedSitemapRoutes = new Set(["/library/", "/library/quiz/", "/quizzes/page/1/"]);

/** @param {string} page */
function sitemapRoutePath(page) {
  const pathname = new URL(page).pathname;

  return pathname;
}

export default defineConfig({
  base: "/",
  server: {
    allowedHosts,
  },
  integrations: [
    react(),
    sitemap({
      filter: (page) => !excludedSitemapRoutes.has(sitemapRoutePath(page)),
    }),
    quizAssets(),
  ],
  output: "static",
  site: "https://quizbun.fyi",
  vite: {
    ...sharedViteConfig,
    plugins: [
      ...(devtoolsBuild ? await DevTools({ build: { withApp: true } }) : []),
      patchCssModules({
        generateSourceTypes: true,
        declarationMap: true,
      }),
    ],
    ...(devtoolsBuild
      ? {
          build: {
            rolldownOptions: {
              devtools: {},
            },
          },
        }
      : {}),
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
