import { useMemo } from "react";
import { ColorFamilyColumn } from "./color-family-column";
import { type ParsedColor } from "./types";
import { parseAndConvertOklchToHex } from "../../lib/oklch-to-hex";

export function ColorPalette({ paletteCss }: { paletteCss: string }) {
  const colors = useMemo(() => {
    const regex = /--(color-[a-zA-Z0-9-]+):\s*(oklch\([^)]+\));/g;
    const parsed: Record<string, ParsedColor[]> = {};
    let match;

    while ((match = regex.exec(paletteCss)) !== null) {
      const varName = match[1]; // e.g. color-indigo-50
      const oklch = match[2]; // oklch(...)
      const hex = parseAndConvertOklchToHex(oklch);

      // Group by family (e.g. indigo, pale-slate)
      const parts = varName.split("-");
      const shade = parts.pop()!;
      parts.shift(); // remove 'color'
      const family = parts.join("-");

      if (!parsed[family]) {
        parsed[family] = [];
      }

      parsed[family].push({
        name: `${family}-${shade}`,
        varName: `--${varName}`,
        oklch,
        hex,
        shade,
      });
    }
    return parsed;
  }, [paletteCss]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "32px",
        fontFamily: "system-ui, sans-serif",
        padding: "24px",
      }}
    >
      <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>Color Palette</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "32px",
          alignItems: "start",
        }}
      >
        {Object.entries(colors).map(([family, shades]) => (
          <ColorFamilyColumn key={family} family={family} shades={shades} />
        ))}
      </div>
    </div>
  );
}
