/**
 * Position-preserving edits to a JSON document.
 *
 * `content/quizzes/**` is excluded from the formatter, so its whitespace is
 * whatever an author wrote and reserializing a file would rewrite every line of
 * it. A generator that has to stay reviewable therefore edits the source text
 * in place: parse to offsets, splice the few bytes that change, leave the rest
 * byte-for-byte identical.
 *
 * The parser accepts strict JSON only, exactly what `JSON.parse` accepts. It
 * records where each value and member key begins and ends, and nothing else —
 * it is not a general JSON AST.
 */

export interface JsonMember {
  key: string;
  keyStart: number;
  value: JsonNode;
}

export interface JsonNode {
  end: number;
  /** Present on arrays. */
  items?: JsonNode[];
  /** Present on objects, in source order. */
  members?: JsonMember[];
  start: number;
}

/** A replacement of `[start, end)` with `text`. An empty range is an insertion. */
export interface SourceEdit {
  end: number;
  start: number;
  text: string;
}

export function parseJsonSource(text: string): JsonNode {
  let index = 0;

  function fail(message: string): never {
    throw new SyntaxError(`${message} at position ${index}.`);
  }

  function skipWhitespace() {
    while (index < text.length && /[\s]/.test(text[index] as string)) index += 1;
  }

  function expect(character: string) {
    if (text[index] !== character) fail(`Expected \`${character}\``);
    index += 1;
  }

  function parseString(): string {
    expect('"');

    const contentStart = index;

    while (index < text.length) {
      const character = text[index];

      if (character === "\\") {
        index += 2;
        continue;
      }

      if (character === '"') {
        const raw = text.slice(contentStart, index);
        index += 1;

        return JSON.parse(`"${raw}"`) as string;
      }

      index += 1;
    }

    fail("Unterminated string");
  }

  function parseObject(): JsonNode {
    const start = index;
    const members: JsonMember[] = [];

    expect("{");
    skipWhitespace();

    if (text[index] === "}") {
      index += 1;
      return { end: index, members, start };
    }

    for (;;) {
      skipWhitespace();

      const keyStart = index;
      const key = parseString();

      skipWhitespace();
      expect(":");
      skipWhitespace();

      members.push({ key, keyStart, value: parseValue() });
      skipWhitespace();

      if (text[index] === ",") {
        index += 1;
        continue;
      }

      expect("}");

      return { end: index, members, start };
    }
  }

  function parseArray(): JsonNode {
    const start = index;
    const items: JsonNode[] = [];

    expect("[");
    skipWhitespace();

    if (text[index] === "]") {
      index += 1;
      return { end: index, items, start };
    }

    for (;;) {
      skipWhitespace();
      items.push(parseValue());
      skipWhitespace();

      if (text[index] === ",") {
        index += 1;
        continue;
      }

      expect("]");

      return { end: index, items, start };
    }
  }

  function parseLiteral(): JsonNode {
    const start = index;

    for (const literal of ["true", "false", "null"]) {
      if (text.startsWith(literal, index)) {
        index += literal.length;
        return { end: index, start };
      }
    }

    while (index < text.length && /[\d+.Ee-]/.test(text[index] as string)) index += 1;

    if (index === start) fail("Expected a JSON value");

    return { end: index, start };
  }

  function parseValue(): JsonNode {
    skipWhitespace();

    const character = text[index];

    if (character === "{") return parseObject();
    if (character === "[") return parseArray();

    if (character === '"') {
      const start = index;
      parseString();

      return { end: index, start };
    }

    return parseLiteral();
  }

  const root = parseValue();

  skipWhitespace();

  if (index !== text.length) fail("Unexpected trailing content");

  return root;
}

export function findMember(node: JsonNode, key: string): JsonMember | undefined {
  return node.members?.find((member) => member.key === key);
}

/**
 * Adds members to an object after `anchor`, matching how the object is already
 * written: one member per line at the existing indentation, or inline when the
 * whole object sits on one line.
 */
export function createMemberInsertion(
  source: string,
  object: JsonNode,
  anchor: JsonMember,
  additions: ReadonlyArray<{ key: string; value: string }>,
): SourceEdit {
  const indent = readMemberIndent(source, object);
  const separator = indent === undefined ? " " : `\n${indent}`;
  const text = additions
    .map((addition) => `,${separator}${JSON.stringify(addition.key)}: ${addition.value}`)
    .join("");

  return { end: anchor.value.end, start: anchor.value.end, text };
}

/** The indentation of an object's members, or `undefined` when it is written on one line. */
function readMemberIndent(source: string, object: JsonNode): string | undefined {
  const firstMember = object.members?.[0];

  if (firstMember === undefined) return undefined;

  const lineBreak = source.lastIndexOf("\n", firstMember.keyStart);

  if (lineBreak === -1 || lineBreak < object.start) return undefined;

  return source.slice(lineBreak + 1, firstMember.keyStart);
}

/**
 * Applies edits back to front so earlier offsets stay valid. Overlapping edits
 * are a bug in the caller, not something to silently resolve.
 */
export function applyJsonEdits(source: string, edits: readonly SourceEdit[]): string {
  const ordered = [...edits].sort((left, right) => right.start - left.start);
  let result = source;
  let previousStart = source.length;

  for (const edit of ordered) {
    if (edit.end > previousStart) {
      throw new Error(`Overlapping edit at position ${edit.start}.`);
    }

    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
    previousStart = edit.start;
  }

  return result;
}
