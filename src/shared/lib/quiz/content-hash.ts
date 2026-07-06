import type { Question } from "./schema";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Object key order is not part of a Question's content, but array order is
// (Option identity is original JSON order), so keys are sorted while arrays
// keep their position.
function stableSerialize(value: JsonValue): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key]!)}`);

    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value);
}

/** Deterministic fingerprint of a Question's content (SHA-256, lowercase hex). */
export async function computeContentHash(question: Question): Promise<string> {
  const serialized = stableSerialize(question as JsonValue);
  const bytes = new TextEncoder().encode(serialized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
