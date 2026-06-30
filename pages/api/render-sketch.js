const { createApiHandler } = require("../../lib/sketch/handler");
const { renderSketch } = require("../../lib/sketch/render-2d");
const { parseStylesParam } = require("../../lib/sketch/style-codec");
const {
  parseTitle,
  parsePlanFeature,
  parseElevationFeature,
  parseGridRows,
  buildEmptyGrid,
} = require("../../lib/sketch/parse");

function renderFromQuery(query) {
  const title = parseTitle(query.title, "Zoning Regulation");
  const subtitle = typeof query.subtitle === "string" ? query.subtitle.trim() : "";
  const styles = parseStylesParam(query.styles);
  const plan = parsePlanFeature(query);
  const elevation = parseElevationFeature(query);

  let rows = parseGridRows(query);
  if (!rows) {
    if (plan.enabled) {
      rows = buildEmptyGrid(plan.width, plan.depth);
    } else {
      throw new Error("rows or grid parameter is required");
    }
  }

  if (plan.enabled && plan.setback * 2 >= plan.width) {
    throw new Error("setback must be smaller than half of width and depth");
  }
  if (plan.enabled && plan.setback * 2 >= plan.depth) {
    throw new Error("setback must be smaller than half of width and depth");
  }

  return renderSketch({
    rows,
    title,
    subtitle: subtitle || undefined,
    styles,
    plan: plan.enabled ? plan : undefined,
    elevation: elevation.enabled ? elevation : undefined,
  });
}

const handler = createApiHandler(renderFromQuery);
module.exports = handler;
module.exports.default = handler;
