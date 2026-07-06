import { describe, expect, test } from "vitest";

import { parseAndConvertOklchToHex } from "./oklch-to-hex";

describe("parseAndConvertOklchToHex", () => {
  test("parses palette OKLCH values with degree hue units", () => {
    expect(parseAndConvertOklchToHex("oklch(98.2% 0.001 236.81deg)")).toBe("#F8F9FA");
  });

  test("keeps unitless hue values working", () => {
    expect(parseAndConvertOklchToHex("oklch(98.2% 0.001 236.81)")).toBe("#F8F9FA");
  });

  test("supports other CSS angle units", () => {
    expect(parseAndConvertOklchToHex("oklch(98.2% 0.001 0.657805turn)")).toBe("#F8F9FA");
    expect(parseAndConvertOklchToHex("oklch(98.2% 0.001 4.132115rad)")).toBe("#F8F9FA");
    expect(parseAndConvertOklchToHex("oklch(98.2% 0.001 263.122grad)")).toBe("#F8F9FA");
  });

  test("falls back to black for unsupported input", () => {
    expect(parseAndConvertOklchToHex("not-oklch")).toBe("#000000");
  });
});
