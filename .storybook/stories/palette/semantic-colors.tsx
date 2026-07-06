import { faker } from "@faker-js/faker/locale/en";
import { useMemo } from "react";

type SemanticColor = {
  section: string;
  name: string;
  varName: string;
};

type ColorMode = "light" | "dark";

function parseSemanticColors(colorsCss: string): SemanticColor[] {
  const semanticColors: SemanticColor[] = [];
  let section = "Other";

  for (const line of colorsCss.split("\n")) {
    const sectionMatch = line.match(/\/\*\*?\s*([^*]+?)\s*\*\//);

    if (sectionMatch) {
      section = sectionMatch[1].trim();
      continue;
    }

    const tokenMatch = line.match(/--(color-[a-zA-Z0-9-]+):/);

    if (!tokenMatch) {
      continue;
    }

    semanticColors.push({
      section,
      name: tokenMatch[1],
      varName: `--${tokenMatch[1]}`,
    });
  }

  return semanticColors;
}

function groupColorsBySection(colors: SemanticColor[]) {
  return colors.reduce<Record<string, SemanticColor[]>>((sections, color) => {
    sections[color.section] ??= [];
    sections[color.section].push(color);
    return sections;
  }, {});
}

function getSampleText(color: SemanticColor) {
  const seed = Array.from(color.varName).reduce((total, char) => total + char.charCodeAt(0), 0);

  faker.seed(seed);

  return faker.lorem.sentence({ max: 10, min: 5 });
}

function SemanticColorColumn({
  colors,
  mode,
}: {
  colors: Record<string, SemanticColor[]>;
  mode: ColorMode;
}) {
  return (
    <section
      style={{
        background: "var(--color-main-bg)",
        color: "var(--color-text-primary)",
        colorScheme: mode,
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        minWidth: 0,
        padding: "24px",
      }}
    >
      <h2
        style={{
          fontSize: "28px",
          fontWeight: 700,
          margin: 0,
          textTransform: "capitalize",
        }}
      >
        {mode}
      </h2>

      {Object.entries(colors).map(([section, sectionColors]) => (
        <section key={section} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h3
            style={{
              borderBottom: "1px solid var(--color-border-subtle)",
              fontSize: "20px",
              fontWeight: 700,
              margin: 0,
              paddingBottom: "8px",
            }}
          >
            {section}
          </h3>

          <div style={{ display: "grid", gap: "12px" }}>
            {sectionColors.map((color) => (
              <article
                key={`${mode}-${color.varName}`}
                style={{
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: "8px",
                  display: "grid",
                  gap: "12px",
                  padding: "16px",
                }}
              >
                <div
                  style={{ display: "flex", gap: "12px", alignItems: "baseline", flexWrap: "wrap" }}
                >
                  <strong style={{ display: "block", fontSize: "14px" }}>{color.name}</strong>
                  <code
                    style={{
                      color: "var(--color-text-secondary)",
                      display: "block",
                      fontSize: "14px",
                      marginTop: "6px",
                    }}
                  >
                    var({color.varName})
                  </code>
                </div>

                <p
                  style={{
                    color: `var(${color.varName})`,
                    fontSize: "18px",
                    lineHeight: 1.4,
                    margin: 0,
                  }}
                >
                  {getSampleText(color)}
                </p>

                <div
                  aria-label={`${color.name} swatch`}
                  style={{
                    background: `var(${color.varName})`,
                    border: "1px solid var(--color-border-subtle)",
                    borderRadius: "6px",
                    minHeight: "56px",
                  }}
                />
              </article>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}

export function SemanticColors({ colorsCss }: { colorsCss: string }) {
  const colors = useMemo(() => groupColorsBySection(parseSemanticColors(colorsCss)), [colorsCss]);

  return (
    <div
      style={{
        display: "grid",
        fontFamily: "system-ui, sans-serif",
        gap: "24px",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      }}
    >
      <SemanticColorColumn colors={colors} mode="light" />
      <SemanticColorColumn colors={colors} mode="dark" />
    </div>
  );
}
