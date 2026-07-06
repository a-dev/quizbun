import { cx as classix } from "classix";

/**
 * Class value shape accepted by `cx`.
 *
 * Pinned here (not re-exported from `classix`) so swapping the underlying
 * library is a single-file change. Any library with `(...args: ClassValue[])
 * => string` semantics drops in; the consumer surface stays identical.
 *
 * Falsy entries are dropped — for optional passthrough only: a `className`
 * prop that may be `undefined`, or an optional enum lookup like
 * `!!size && SIZE_CLASS[size]`. Boolean state never rides `cx` conditionals;
 * it belongs on `data-*` attributes (css-modules-quizbun skill). Other shapes (numbers,
 * arrays, objects) are intentionally not accepted.
 */
export type ClassValue = string | false | null | undefined;

/**
 * Merge class names. Re-exported as `cx` from `#styles`.
 *
 * Direct `classix` imports are forbidden outside this module (see
 * `.oxlintrc.json` `no-restricted-imports`). Importing from `#styles`
 * keeps the contract stable.
 */
export const cx = (...args: ClassValue[]): string => classix(...args);
