// Site identity that has to be stated in more than one place: the document head
// and the generated web app manifest. Both are read by different consumers
// (browser, OS installer), so a drifted copy surfaces as a mismatched install
// experience rather than a build error — hence one source. The hand-authored
// install icons in `public/icons/` are a third copy that no code can reach; see
// dev-docs/storage-durability-plan.md §9.

export const SITE_NAME = "Quizbun";

export const SITE_DESCRIPTION =
  "Quizbun: explanation-first quizzes, bundled public catalog, and a library for your own quiz collection. All static, all open source, and all for learning.";

/** The brand blue — light-theme `--color-main-bg-dark` (`--color-blue-600`). */
export const SITE_THEME_COLOR = "#4d84a7";

/**
 * Light-theme `--color-main-bg` (`--color-gray-10`,
 * `oklch(98.1% 0.005 234.97deg)`) as an sRGB hex literal. Manifest colors are
 * baked outside CSS, where custom properties can't reach, and hex is the safe
 * interop choice. The maskable icon's plate should match this by eye.
 */
export const SITE_BACKGROUND_COLOR = "#f6f9fc";
