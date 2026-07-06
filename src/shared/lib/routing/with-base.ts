/**
 * Prefixes a site-internal path with the configured Astro base.
 * GitHub Pages builds serve under `/quizbun`, so absolute paths to site
 * routes must never be hardcoded.
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;

  return `${normalizedBase}${path.replace(/^\//, "")}`;
}
