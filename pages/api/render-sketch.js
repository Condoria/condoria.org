const { createApiHandler } = require("../../lib/sketch/handler");
const { renderPlan, renderElevation, renderGrid } = require("../../lib/sketch/render-2d");
const {
  parseIntParam,
  parseBoolParam,
  parseTitle,
  parseView,
  parsePlotDimensions,
  parseGridRows,
} = require("../../lib/sketch/parse");

function renderFromQuery(query) {
  const view = parseView(query);
  const title = parseTitle(query.title, "Zoning Regulation");

  if (view === "grid") {
    const rows = parseGridRows(query);
    if (!rows) {
      throw new Error("grid view requires rows or grid parameter");
    }
    const subtitle = typeof query.subtitle === "string" ? query.subtitle.trim() : "";
    return renderGrid({ rows, title, subtitle: subtitle || undefined });
  }

  if (view === "elevation") {
    const maxheight = parseIntParam(query.maxheight, 25);
    const showOverLimit = parseBoolParam(query.showover, true);
    const columns = parseIntParam(query.columns, 1, 1);
    return renderElevation({ maxheight, showOverLimit, title, columns });
  }

  const { width, depth } = parsePlotDimensions(query);
  const setback = parseIntParam(query.setback, 3);
  const maxheight = parseIntParam(query.maxheight, 25);
  return renderPlan({ width, depth, setback, maxheight, title });
}

const handler = createApiHandler(renderFromQuery);
module.exports = handler;
module.exports.default = handler;
