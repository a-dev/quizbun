import { ColorSwatch } from "./color-swatch";
import { type ParsedColor } from "./types";

export function ColorFamilyColumn({ family, shades }: { family: string; shades: ParsedColor[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h2
        style={{
          fontSize: "20px",
          fontWeight: 600,
          textTransform: "capitalize",
          margin: 0,
          paddingBottom: "8px",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        {family.replace("-", " ")}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {shades.map((color) => (
          <ColorSwatch key={color.name} color={color} />
        ))}
      </div>
    </div>
  );
}
