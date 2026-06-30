const { createApiHandler } = require("../../lib/sketch/handler");
const { generateSketch3d } = require("../../lib/sketch/render-3d");
const { parseIntParam, parseTitle, parsePlotDimensions } = require("../../lib/sketch/parse");

function renderFromQuery(query) {
  const { width, depth } = parsePlotDimensions(query);
  const setback = parseIntParam(query.setback, 3);
  const maxheight = parseIntParam(query.maxheight, 25);
  const title = parseTitle(query.title, "Zoning Regulation");

  if (setback * 2 >= width || setback * 2 >= depth) {
    throw new Error("setback must be smaller than half of width and depth");
  }

  return generateSketch3d({ maxheight, setback, width, depth, title });
}

const handler = createApiHandler(renderFromQuery);
module.exports = handler;
module.exports.default = handler;
