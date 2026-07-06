import type { APIRoute } from "astro";

import { listDocExamples } from "@/shared/lib/docs";

/**
 * Emits each canonical example from `docs/examples/` as a downloadable
 * `/docs/examples/{file}.json` file at build time — the repo JSON stays the
 * single source; nothing is copied into `public/`.
 */

export function getStaticPaths() {
  return listDocExamples().map((example) => ({
    params: { file: example.fileName },
    props: { json: example.json },
  }));
}

export const GET: APIRoute = ({ props }) => {
  return new Response(props.json as string, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
