import type { APIRoute } from "astro";

import { withBase } from "@/shared/lib/routing";
import {
  SITE_BACKGROUND_COLOR,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_THEME_COLOR,
} from "@/shared/lib/site";

export const GET: APIRoute = () => {
  const manifest = {
    id: withBase("/"),
    scope: withBase("/"),
    start_url: withBase("/"),
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    display: "standalone",
    lang: "en",
    dir: "ltr",
    theme_color: SITE_THEME_COLOR,
    background_color: SITE_BACKGROUND_COLOR,
    categories: ["education"],
    icons: [
      {
        src: withBase("icons/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: withBase("icons/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: withBase("icons/icon-maskable-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json" },
  });
};
