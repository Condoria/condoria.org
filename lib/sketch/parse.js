function parseIntParam(value, fallback, min = 1) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
}

function parseIntParamAllowZero(value, fallback, min = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
}

function parseBoolParam(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const normalized = String(value).toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function parseTitle(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function parsePlotDimensions(query) {
  const plotsize = parseIntParam(query.plotsize, 0, 1);
  const width = parseIntParam(query.width, plotsize || 16, 1);
  const depth = parseIntParam(query.depth, plotsize || width, 1);
  return { width, depth };
}

function parsePlanFeature(query) {
  const legacy = typeof query.view === "string" && query.view.toLowerCase() === "plan";
  const enabled = parseBoolParam(query.plan, false) || legacy;
  if (!enabled) {
    return { enabled: false };
  }
  const { width, depth } = parsePlotDimensions(query);
  return {
    enabled: true,
    width: width || 16,
    depth: depth || 16,
    setback: parseIntParamAllowZero(query.setback, 3, 0),
    maxheight: parseIntParam(query.maxheight, 25),
  };
}

function parseElevationFeature(query) {
  const legacy = typeof query.view === "string" && query.view.toLowerCase() === "elevation";
  const enabled = parseBoolParam(query.elevation, false) || legacy;
  if (!enabled) {
    return { enabled: false };
  }
  return {
    enabled: true,
    maxheight: parseIntParam(query.maxheight, 25),
    showOverLimit: parseBoolParam(query.showover, true),
  };
}

/**
 * Parse grid rows — first row in text is the top row of the sketch.
 */
function parseGridRows(query) {
  const raw =
    typeof query.rows === "string"
      ? query.rows
      : typeof query.grid === "string"
        ? query.grid
        : "";

  if (!raw.trim()) {
    return null;
  }

  const separator = raw.includes("|") ? "|" : /\r?\n/;
  const rows = raw
    .split(separator)
    .map((row) => row.replace(/\s+/g, ""))
    .filter((row) => row.length > 0);

  if (rows.length === 0) {
    return null;
  }

  const cols = Math.max(...rows.map((row) => row.length));
  return rows.map((row) => row.padEnd(cols, "-"));
}

function buildEmptyGrid(width, depth, fill = "-") {
  return Array.from({ length: depth }, () => Array.from({ length: width }, () => fill));
}

module.exports = {
  parseIntParam,
  parseIntParamAllowZero,
  parseBoolParam,
  parseTitle,
  parsePlotDimensions,
  parsePlanFeature,
  parseElevationFeature,
  parseGridRows,
  buildEmptyGrid,
};
