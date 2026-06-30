const { createCanvas } = require("./canvas");
const { getCellStyle, legendForGrid, TRANSPARENT_CHAR } = require("./style-codec");

const CELL_SIZE = 22;
const HEADER_OFFSET = 72;
const ELEV_GAP = 20;
const LEGEND_GAP = 16;

/** Row 0 is the top row of the sketch (matches text input order). */
function cellOrigin(originX, originY, col, row) {
  return {
    x: originX + col * CELL_SIZE,
    y: originY + row * CELL_SIZE,
  };
}

function drawStyledCell(canvas, x, y, style, options = {}) {
  const pad = 1.5;
  if (style.transparent && !options.forceBorder) {
    return;
  }

  if (options.overLimit) {
    canvas.fillRect(x + pad, y + pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2, "#c0392b", 0.5);
    canvas.sketchRect(x, y, CELL_SIZE, CELL_SIZE, {
      stroke: "#c0392b",
      strokeWidth: 1.2,
      roughness: 1,
      bowing: 0.4,
    });
    return;
  }

  if (!style.transparent && style.fill) {
    canvas.fillRect(x + pad, y + pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2, style.fill, style.opacity);
  }

  if (!style.transparent || options.forceBorder) {
    canvas.sketchRect(x, y, CELL_SIZE, CELL_SIZE, {
      stroke: style.stroke ?? "#888888",
      strokeWidth: options.strokeWidth ?? 1.2,
      roughness: options.roughness ?? 1,
      bowing: 0.4,
      ...(style.dashed ? { strokeLineDash: [4, 3] } : {}),
    });
  }
}

function drawGridLines(canvas, originX, originY, cols, rows, style) {
  for (let c = 0; c <= cols; c++) {
    const x = originX + c * CELL_SIZE;
    canvas.sketchLine(x, originY, x, originY + rows * CELL_SIZE, style);
  }
  for (let r = 0; r <= rows; r++) {
    const y = originY + r * CELL_SIZE;
    canvas.sketchLine(originX, y, originX + cols * CELL_SIZE, y, style);
  }
}

function drawPlanUnderlay(canvas, originX, originY, plan, gridCols, gridRows) {
  const { width, depth, setback, maxheight } = plan;
  const plotW = Math.min(width, gridCols);
  const plotD = Math.min(depth, gridRows);
  const innerW = plotW - setback * 2;
  const innerD = plotD - setback * 2;

  if (innerW <= 0 || innerD <= 0) {
    throw new Error("setback must be smaller than half of width and depth");
  }

  for (let row = 0; row < plotD; row++) {
    for (let col = 0; col < plotW; col++) {
      const inBuildable =
        row >= setback && row < plotD - setback && col >= setback && col < plotW - setback;
      const inSetback =
        row < setback || row >= plotD - setback || col < setback || col >= plotW - setback;
      const { x, y } = cellOrigin(originX, originY, col, row);

      if (inBuildable) {
        canvas.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, "#e8f4ea", 0.55);
      } else if (inSetback) {
        canvas.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, "#fdecea", 0.5);
      }
    }
  }

  canvas.sketchRect(originX, originY, plotW * CELL_SIZE, plotD * CELL_SIZE, {
    stroke: "#888888",
    strokeWidth: 2,
    roughness: 1,
    bowing: 0.5,
  });

  canvas.sketchRect(
    originX + setback * CELL_SIZE,
    originY + setback * CELL_SIZE,
    innerW * CELL_SIZE,
    innerD * CELL_SIZE,
    { stroke: "#c0392b", strokeWidth: 2, roughness: 1.1, bowing: 0.6 },
  );

  canvas.appendText(
    originX + setback * CELL_SIZE + (innerW * CELL_SIZE) / 2,
    originY + setback * CELL_SIZE - 8,
    `${innerW}×${innerD} buildable · max ${maxheight} blocks`,
    { fontSize: 11, fill: "#555555" },
  );
}

function drawElevationColumn(canvas, originX, originY, elevation, alignBottomY) {
  const { maxheight, showOverLimit } = elevation;
  const displayRows = maxheight + (showOverLimit ? 1 : 0);
  const columnBottom = alignBottomY;
  const columnTop = columnBottom - displayRows * CELL_SIZE;

  drawGridLines(canvas, originX, columnTop, 1, displayRows, {
    stroke: "#cccccc",
    strokeWidth: 0.7,
    roughness: 0.6,
    bowing: 0.3,
  });

  for (let i = 0; i < maxheight; i++) {
    const row = displayRows - 1 - i;
    const { x, y } = cellOrigin(originX, columnTop, 0, row);
    drawStyledCell(canvas, x, y, {
      fill: "#eef2f7",
      stroke: "#2c3e50",
      opacity: 1,
      transparent: false,
    });
  }

  if (showOverLimit) {
    const { x, y } = cellOrigin(originX, columnTop, 0, 0);
    drawStyledCell(
      canvas,
      x,
      y,
      { transparent: false },
      { overLimit: true },
    );
  }

  canvas.sketchRect(originX, columnTop, CELL_SIZE, displayRows * CELL_SIZE, {
    stroke: "#888888",
    strokeWidth: 1.8,
    roughness: 1,
    bowing: 0.5,
  });

  canvas.sketchLine(originX - 6, columnBottom, originX + CELL_SIZE + 6, columnBottom, {
    stroke: "#666666",
    strokeWidth: 1.5,
    roughness: 1,
  });

  const maxRow = displayRows - (showOverLimit ? 2 : 1);
  const maxY = cellOrigin(originX, columnTop, 0, maxRow).y;
  canvas.appendText(originX + CELL_SIZE + 14, maxY + CELL_SIZE / 2 + 4, `max ${maxheight}`, {
    fontSize: 11,
    fill: "#555555",
    textAnchor: "start",
  });

  if (showOverLimit) {
    const overY = cellOrigin(originX, columnTop, 0, 0).y;
    canvas.appendText(originX + CELL_SIZE + 14, overY + CELL_SIZE / 2 + 4, "not allowed", {
      fontSize: 11,
      fill: "#c0392b",
      textAnchor: "start",
    });
  }

  canvas.appendText(originX + CELL_SIZE / 2, columnTop - 10, "height", {
    fontSize: 11,
    fill: "#666666",
  });

  return displayRows * CELL_SIZE;
}

function drawLegend(canvas, originX, originY, legend) {
  let x = originX;
  for (const item of legend) {
    drawStyledCell(canvas, x, originY, item, { forceBorder: true });
    canvas.appendText(x + CELL_SIZE / 2, originY + CELL_SIZE + 14, `${item.key} · ${item.label}`, {
      fontSize: 10,
      fill: "#555555",
    });
    x += CELL_SIZE + 88;
  }

  drawStyledCell(
    canvas,
    x,
    originY,
    { transparent: true, stroke: "#dddddd" },
    { forceBorder: true },
  );
  canvas.appendText(x + CELL_SIZE / 2, originY + CELL_SIZE + 14, `${TRANSPARENT_CHAR} · empty`, {
    fontSize: 10,
    fill: "#555555",
  });
}

function renderSketch({ rows, title, styles, plan, elevation, subtitle }) {
  const gridRows = rows.length;
  const gridCols = rows[0].length;
  const canvas = createCanvas();
  const originX = 0;
  const originY = HEADER_OFFSET;

  const mainGridH = gridRows * CELL_SIZE;
  const elevRows = elevation?.enabled ? elevation.maxheight + (elevation.showOverLimit ? 1 : 0) : 0;
  const elevH = elevRows * CELL_SIZE;
  const contentBottom = originY + Math.max(mainGridH, elevH);

  if (plan?.enabled) {
    drawPlanUnderlay(canvas, originX, originY, plan, gridCols, gridRows);
  }

  drawGridLines(canvas, originX, originY, gridCols, gridRows, {
    stroke: "#dddddd",
    strokeWidth: 0.6,
    roughness: 0.5,
    bowing: 0.2,
  });

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const char = rows[row][col] ?? TRANSPARENT_CHAR;
      const style = getCellStyle(char, styles);
      const { x, y } = cellOrigin(originX, originY, col, row);
      drawStyledCell(canvas, x, y, style);
    }
  }

  canvas.sketchRect(originX, originY, gridCols * CELL_SIZE, gridRows * CELL_SIZE, {
    stroke: "#888888",
    strokeWidth: 1.8,
    roughness: 1,
    bowing: 0.5,
  });

  if (elevation?.enabled) {
    const elevX = originX + gridCols * CELL_SIZE + ELEV_GAP;
    drawElevationColumn(canvas, elevX, originY, elevation, originY + mainGridH);
  }

  const legend = legendForGrid(rows, styles);
  const legendY = contentBottom + LEGEND_GAP;
  if (legend.length > 0) {
    drawLegend(canvas, originX, legendY, legend);
  }

  const parts = [];
  if (subtitle?.trim()) {
    parts.push(subtitle.trim());
  } else if (plan?.enabled) {
    parts.push(`${plan.width}×${plan.depth} plot · ${plan.setback}-block setback`);
  }
  if (elevation?.enabled) {
    parts.push(`height limit ${elevation.maxheight} blocks`);
  }
  if (parts.length === 0) {
    parts.push(`${gridCols}×${gridRows} grid`);
  }

  const centerX = originX + gridCols * CELL_SIZE / 2;
  canvas.drawHeader(title, parts.join(" · "), centerX);
  return canvas.toString();
}

module.exports = { renderSketch, CELL_SIZE };
