import { describe, expect, test } from "vitest";

import {
  applyJsonEdits,
  createMemberInsertion,
  findMember,
  type JsonNode,
  parseJsonSource,
} from "./json-source-edit";

describe("parseJsonSource", () => {
  test("records offsets that slice back to the original value text", () => {
    const source = '{ "src": "a.svg", "width": 20 }';
    const root = parseJsonSource(source);
    const src = findMember(root, "src")!.value;
    const width = findMember(root, "width")!.value;

    expect(source.slice(src.start, src.end)).toBe('"a.svg"');
    expect(source.slice(width.start, width.end)).toBe("20");
  });

  // The generator splices source text, so a value must slice back byte for
  // byte — re-serializing it would rewrite escapes and number formatting.
  test.each([
    ["a string holding braces and escapes", '"A \\"quoted\\" {caption}"', "alt"],
    ["an exponent number", "-1.5e-3", "ratio"],
    ["a unicode escape that must not be decoded in place", '"\\u00e9t\\u00e9"', "alt"],
    ["a null literal", "null", "caption"],
    ["an empty array", "[]", "images"],
  ])("preserves %s verbatim", (_label, raw, key) => {
    const source = `{ ${JSON.stringify(key)}: ${raw} }`;
    const value = findMember(parseJsonSource(source), key)!.value;

    expect(source.slice(value.start, value.end)).toBe(raw);
  });

  test("walks nested arrays and objects", () => {
    const source = '{ "questions": [ { "images": [ { "src": "a.svg" } ] } ] }';
    const question = findMember(parseJsonSource(source), "questions")!.value.items![0] as JsonNode;
    const image = findMember(question, "images")!.value.items![0] as JsonNode;

    expect(findMember(image, "src")).toBeDefined();
    expect(findMember(image, "width")).toBeUndefined();
  });

  test.each([
    ["trailing content", '{ "a": 1 } extra'],
    ["an unterminated string", '{ "a": "b }'],
    ["a missing value", '{ "a": }'],
  ])("rejects %s", (_label, source) => {
    expect(() => parseJsonSource(source)).toThrow(SyntaxError);
  });
});

describe("createMemberInsertion", () => {
  test("adds members on their own lines at the object's indentation", () => {
    const source = ["{", '  "src": "a.svg",', '  "alt": "A"', "}"].join("\n");

    expect(
      insert(source, [
        { key: "width", value: "20" },
        { key: "height", value: "10" },
      ]),
    ).toBe(
      ["{", '  "src": "a.svg",', '  "alt": "A",', '  "width": 20,', '  "height": 10', "}"].join(
        "\n",
      ),
    );
  });

  test("keeps a single-line object on one line", () => {
    const source = '{ "src": "a.svg", "alt": "A" }';

    expect(insert(source, [{ key: "width", value: "20" }])).toBe(
      '{ "src": "a.svg", "alt": "A", "width": 20 }',
    );
  });

  test("matches deeper indentation and leaves surrounding text untouched", () => {
    const source = [
      "{",
      '  "images": [',
      "    {",
      '      "src": "a.svg",',
      '      "alt": "A"',
      "    }",
      "  ]",
      "}",
    ].join("\n");
    const root = parseJsonSource(source);
    const image = findMember(root, "images")!.value.items![0]!;
    const edit = createMemberInsertion(source, image, image.members!.at(-1)!, [
      { key: "width", value: "20" },
    ]);

    expect(applyJsonEdits(source, [edit])).toContain('      "alt": "A",\n      "width": 20\n');
  });
});

describe("applyJsonEdits", () => {
  test("applies edits back to front so earlier offsets stay valid", () => {
    const source = '{ "width": 1, "height": 2 }';
    const root = parseJsonSource(source);
    const width = findMember(root, "width")!.value;
    const height = findMember(root, "height")!.value;

    expect(
      applyJsonEdits(source, [
        { end: width.end, start: width.start, text: "1200" },
        { end: height.end, start: height.start, text: "798" },
      ]),
    ).toBe('{ "width": 1200, "height": 798 }');
  });

  test("returns the source unchanged when there is nothing to apply", () => {
    const source = '{ "a": 1 }';

    expect(applyJsonEdits(source, [])).toBe(source);
  });

  test("refuses overlapping edits rather than silently resolving them", () => {
    expect(() =>
      applyJsonEdits('{ "a": 1 }', [
        { end: 8, start: 2, text: "x" },
        { end: 9, start: 5, text: "y" },
      ]),
    ).toThrow(/Overlapping edit/);
  });
});

function insert(source: string, additions: Array<{ key: string; value: string }>) {
  const object = parseJsonSource(source);
  const edit = createMemberInsertion(source, object, object.members!.at(-1)!, additions);

  return applyJsonEdits(source, [edit]);
}
