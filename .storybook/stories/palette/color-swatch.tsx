import { type ParsedColor } from "./types";

export function ColorSwatch({ color }: { color: ParsedColor }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div
        style={{
          backgroundColor: color.hex, // Fallback
        }}
      >
        <div
          style={{
            backgroundColor: `var(${color.varName}, ${color.hex})`,
            height: "80px",
            borderRadius: "8px",
            border: "1px solid rgba(0,0,0,0.1)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: "13px",
          color: "#4b5563",
        }}
      >
        <span style={{ fontWeight: 600, color: "#111827" }}>{color.shade}</span>
        <span
          style={{
            marginTop: "2px",
            fontFamily: "monospace",
            color: "#374151",
          }}
        >
          {color.hex}
        </span>
        <span style={{ color: "#6b7280", fontSize: "11px", marginTop: "2px" }}>{color.oklch}</span>
      </div>
    </div>
  );
}
