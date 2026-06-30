/**
 * Compact style encoding for URL params.
 * Format: "a|fill|stroke|opacity|label;b|..."
 * '-' is reserved for transparent (not in styles map).
 */

const TRANSPARENT_CHAR = "-";

const DEFAULT_STYLES = {
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

function isStyleKey(char) {
  return /^[a-z]$/i.test(char);
}

function normalizeStyle(raw, key) {
  return {
    fill: raw.fill?.startsWith("#") ? raw.fill : `#${raw.fill ?? "cccccc"}`,
    stroke: raw.stroke?.startsWith("#") ? raw.stroke : `#${raw.stroke ?? "888888"}`,
    opacity: Number.isFinite(raw.opacity) ? Math.min(1, Math.max(0, raw.opacity)) : 1,
    label: raw.label?.trim() || `style ${key}`,
  };
}

function parseStylesParam(value) {
  if (!value || typeof value !== "string" || !value.trim()) {
    return { ...DEFAULT_STYLES };
  }

  const styles = {};
  const chunks = value.split(";").map((s) => s.trim()).filter(Boolean);

  for (const chunk of chunks) {
    const parts = chunk.split("|");
    if (parts.length < 4) {
      continue;
    }
    const key = parts[0].trim();
    if (!isStyleKey(key)) {
      continue;
    }
    const [fill, stroke, opacity, ...labelParts] = parts.slice(1);
    styles[key] = normalizeStyle(
      {
        fill,
        stroke,
        opacity: Number.parseFloat(opacity),
        label: labelParts.join("|"),
      },
      key,
    );
  }

  return Object.keys(styles).length > 0 ? styles : { ...DEFAULT_STYLES };
}

function serializeStylesParam(styles) {
  return Object.entries(styles)
    .filter(([key]) => isStyleKey(key))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, style]) => {
      const fill = style.fill.replace("#", "");
      const stroke = style.stroke.replace("#", "");
      return `${key}|${fill}|${stroke}|${style.opacity}|${style.label}`;
    })
    .join(";");
}

function getCellStyle(char, styles) {
  if (char === TRANSPARENT_CHAR) {
    return { transparent: true };
  }
  if (isStyleKey(char) && styles[char]) {
    return { ...styles[char], transparent: false };
  }
  return { transparent: true };
}

function legendForGrid(rows, styles) {
  const used = new Set(rows.flatMap((row) => [...row]));
  return [...used]
    .filter((char) => isStyleKey(char) && styles[char])
    .sort()
    .map((char) => ({ key: char, ...styles[char] }));
}

module.exports = {
  TRANSPARENT_CHAR,
  DEFAULT_STYLES,
  isStyleKey,
  parseStylesParam,
  serializeStylesParam,
  getCellStyle,
  legendForGrid,
};
