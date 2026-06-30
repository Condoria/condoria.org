export const TRANSPARENT_CHAR = "-";

export type CellStyle = {
  fill: string;
  stroke: string;
  opacity: number;
  label: string;
};

export type CellStyleMap = Record<string, CellStyle>;

export const DEFAULT_STYLES: CellStyleMap = {
  a: {
    fill: "#a67c52",
    stroke: "#6b4f2a",
    opacity: 1,
    label: "wooden slab",
  },
  b: {
    fill: "#4a5568",
    stroke: "#2d3748",
    opacity: 1,
    label: "polished deepslate",
  },
};

export function serializeStylesParam(styles: CellStyleMap) {
  return Object.entries(styles)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, style]) => {
      const fill = style.fill.replace("#", "");
      const stroke = style.stroke.replace("#", "");
      return `${key}|${fill}|${stroke}|${style.opacity}|${style.label}`;
    })
    .join(";");
}
