// OKLCH to HEX converter
type CssAngleUnit = "deg" | "grad" | "rad" | "turn";

export function oklchToHex(l: number, c: number, h: number): string {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l__ = l_ * l_ * l_;
  const m__ = m_ * m_ * m_;
  const s__ = s_ * s_ * s_;

  const r_lin = +4.0767416621 * l__ - 3.3077115913 * m__ + 0.2309699292 * s__;
  const g_lin = -1.2684380046 * l__ + 2.6097574011 * m__ - 0.3413193965 * s__;
  const b_lin = -0.0041960863 * l__ - 0.7034186147 * m__ + 1.707614701 * s__;

  const gamma = (x: number) => {
    const v = Math.max(0, Math.min(1, x));
    return v >= 0.0031308 ? 1.055 * Math.pow(v, 1.0 / 2.4) - 0.055 : 12.92 * v;
  };

  const r = Math.round(gamma(r_lin) * 255);
  const g = Math.round(gamma(g_lin) * 255);
  const bl = Math.round(gamma(b_lin) * 255);

  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1).toUpperCase()}`;
}

export function parseAndConvertOklchToHex(oklchStr: string): string {
  const match = oklchStr.match(
    /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(deg|grad|rad|turn)?\s*\)/,
  );
  if (!match) return "#000000";
  let l = parseFloat(match[1]);
  if (match[2] === "%") {
    l = l / 100;
  }
  const c = parseFloat(match[3]);
  const h = parseCssAngleToDegrees(parseFloat(match[4]), match[5] as CssAngleUnit | undefined);
  return oklchToHex(l, c, h);
}

function parseCssAngleToDegrees(value: number, unit: CssAngleUnit | undefined): number {
  switch (unit) {
    case undefined:
    case "deg":
      return value;
    case "grad":
      return value * 0.9;
    case "rad":
      return (value * 180) / Math.PI;
    case "turn":
      return value * 360;
  }
}
