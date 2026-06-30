const { createCanvas } = require("./canvas");
const { getCellSymbol, legendForRows } = require("./symbols");

const CELL_SIZE = 22;
const HEADER_OFFSET = 72;

function cellOrigin(originX, originY, col, row, totalRows) {
  return {
    x: originX + col * CELL_SIZE,
    y: originY + (totalRows - 1 - row) * CELL_SIZE,
  };
}

function drawCell(canvas, x, y, symbol, options = {}) {
  const { fill, stroke, dashed } = symbol;
  const pad = 1.5;

  if (options.overLimit) {
    canvas.fillRect(x + pad, y + pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2, "#c0392b", 0.5);
  } else if (fill && fill !== "none") {
    canvas.fillRect(x + pad, y + pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2, fill, options.fillOpacity);
  }

  canvas.sketchRect(x, y, CELL_SIZE, CELL_SIZE, {
    stroke,
    strokeWidth: options.strokeWidth ?? 1.2,
    roughness: options.roughness ?? 1,
    bowing: 0.4,
    ...(dashed ? { strokeLineDash: [4, 3] } : {}),
  });
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

function drawDimensionLabel(canvas, x, y, text, anchor = "middle") {
  canvas.appendText(x, y, text, { fontSize: 11, fill: "#555555", textAnchor: anchor });
}

function renderPlan({ width, depth, setback, maxheight, title }) {
  const innerW = width - setback * 2;
  const innerD = depth - setback * 2;
  if (innerW <= 0 || innerD <= 0) {
    throw new Error("setback must be smaller than half of width and depth");
  }

  const canvas = createCanvas();
  const originX = 0;
  const originY = HEADER_OFFSET;
  const lightGrid = { stroke: "#cccccc", strokeWidth: 0.7, roughness: 0.6, bowing: 0.3 };
  drawGridLines(canvas, originX, originY, width, depth, lightGrid);

  for (let row = 0; row < depth; row++) {
    for (let col = 0; col < width; col++) {
      const inBuildable =
        row >= setback && row < depth - setback && col >= setback && col < width - setback;
      const inSetback =
        row < setback || row >= depth - setback || col < setback || col >= width - setback;
      const { x, y } = cellOrigin(originX, originY, col, row, depth);

      if (inBuildable) {
        canvas.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, "#e8f4ea", 0.85);
      } else if (inSetback) {
        canvas.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, "#fdecea", 0.75);
      }
    }
  }

  canvas.sketchRect(originX, originY, width * CELL_SIZE, depth * CELL_SIZE, {
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

  canvas.sketchRect(
    originX + setback * CELL_SIZE,
    originY + setback * CELL_SIZE,
    innerW * CELL_SIZE,
    innerD * CELL_SIZE,
    { stroke: "#2c3e50", strokeWidth: 1.6, roughness: 1.2, bowing: 0.6 },
  );

  drawDimensionLabel(
    canvas,
    originX + (width * CELL_SIZE) / 2,
    originY + depth * CELL_SIZE + 28,
    `${width} blocks wide`,
  );
  drawDimensionLabel(
    canvas,
    originX - 12,
    originY + (depth * CELL_SIZE) / 2,
    `${depth} deep`,
    "end",
  );
  drawDimensionLabel(
    canvas,
    originX + setback * CELL_SIZE + (innerW * CELL_SIZE) / 2,
    originY + setback * CELL_SIZE - 14,
    `${innerW}×${innerD} buildable · max ${maxheight} blocks high`,
  );

  const gridCenterX = originX + (width * CELL_SIZE) / 2;
  canvas.drawHeader(title, `${width}×${depth} plot · ${setback}-block setback`, gridCenterX);
  return canvas.toString();
}

function renderElevation({ maxheight, showOverLimit, title, columns = 1 }) {
  const displayRows = maxheight + (showOverLimit ? 1 : 0);
  const canvas = createCanvas();
  const originX = 48;
  const originY = HEADER_OFFSET;

  drawGridLines(canvas, originX, originY, columns, displayRows, {
    stroke: "#cccccc",
    strokeWidth: 0.7,
    roughness: 0.6,
    bowing: 0.3,
  });

  for (let row = 0; row < maxheight; row++) {
    for (let col = 0; col < columns; col++) {
      const { x, y } = cellOrigin(originX, originY, col, row, displayRows);
      drawCell(canvas, x, y, { fill: "#eef2f7", stroke: "#2c3e50", dashed: false });
    }
  }

  if (showOverLimit) {
    for (let col = 0; col < columns; col++) {
      const { x, y } = cellOrigin(originX, originY, col, maxheight, displayRows);
      drawCell(canvas, x, y, { fill: "#c0392b", stroke: "#c0392b", dashed: false }, { overLimit: true });
    }
  }

  canvas.sketchRect(originX, originY, columns * CELL_SIZE, displayRows * CELL_SIZE, {
    stroke: "#888888",
    strokeWidth: 1.8,
    roughness: 1,
    bowing: 0.5,
  });

  const groundY = originY + displayRows * CELL_SIZE;
  canvas.sketchLine(originX - 8, groundY, originX + columns * CELL_SIZE + 8, groundY, {
    stroke: "#666666",
    strokeWidth: 1.5,
    roughness: 1,
  });
  drawDimensionLabel(canvas, originX - 8, groundY + 22, "ground", "start");

  for (let i = 0; i < maxheight; i += Math.max(1, Math.floor(maxheight / 8))) {
    const { y } = cellOrigin(originX, originY, 0, i, displayRows);
    drawDimensionLabel(canvas, originX - 12, y + CELL_SIZE / 2 + 4, String(i + 1), "end");
  }

  const maxRowY = cellOrigin(originX, originY, 0, maxheight - 1, displayRows).y;
  canvas.sketchLine(originX - 4, maxRowY, originX + columns * CELL_SIZE + 4, maxRowY, {
    stroke: "#2c3e50",
    strokeWidth: 1.2,
    roughness: 0.8,
    strokeLineDash: [5, 4],
  });
  drawDimensionLabel(
    canvas,
    originX + columns * CELL_SIZE + 16,
    maxRowY + CELL_SIZE / 2 + 4,
    `max ${maxheight} blocks`,
    "start",
  );

  if (showOverLimit) {
    drawDimensionLabel(
      canvas,
      originX + columns * CELL_SIZE + 16,
      cellOrigin(originX, originY, 0, maxheight, displayRows).y + CELL_SIZE / 2 + 4,
      "not allowed",
      "start",
    );
  }

  const gridCenterX = originX + (columns * CELL_SIZE) / 2;
  canvas.drawHeader(title, `Side view · maximum height ${maxheight} blocks`, gridCenterX);
  return canvas.toString();
}

function renderGrid({ rows, title, subtitle }) {
  const gridRows = rows.length;
  const gridCols = rows[0].length;
  const legend = legendForRows(rows);
  const canvas = createCanvas();
  const originX = 0;
  const originY = HEADER_OFFSET;

  drawGridLines(canvas, originX, originY, gridCols, gridRows, {
    stroke: "#dddddd",
    strokeWidth: 0.6,
    roughness: 0.5,
    bowing: 0.2,
  });

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const char = rows[row][col] ?? ".";
      const symbol = getCellSymbol(char);
      const { x, y } = cellOrigin(originX, originY, col, row, gridRows);
      drawCell(canvas, x, y, symbol);
    }
  }

  canvas.sketchRect(originX, originY, gridCols * CELL_SIZE, gridRows * CELL_SIZE, {
    stroke: "#888888",
    strokeWidth: 1.8,
    roughness: 1,
    bowing: 0.5,
  });

  const legendText = subtitle ?? (legend.length > 0 ? legend.join(" · ") : `${gridCols}×${gridRows} pattern`);
  const gridCenterX = originX + (gridCols * CELL_SIZE) / 2;
  canvas.drawHeader(title, legendText, gridCenterX);
  return canvas.toString();
}

module.exports = { renderPlan, renderElevation, renderGrid, CELL_SIZE };
