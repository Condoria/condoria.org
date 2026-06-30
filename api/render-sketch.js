const { JSDOM } = require("jsdom");
const rough = require("roughjs");

const ISO_X = Math.cos(Math.PI / 6); // cos(30°) — horizontal spread on screen
const ISO_Z = Math.sin(Math.PI / 6); // sin(30°) — depth axis on screen

/**
 * Isometric projection: Minecraft (X, Y, Z) → 2D screen (px, py).
 * Y is vertical in-world; screen Y grows downward, so height subtracts from screen Y.
 */
function project(x, y, z, scale, offsetX, offsetY) {
  return {
    x: (x - z) * ISO_X * scale + offsetX,
    y: (x + z) * ISO_Z * scale - y * scale + offsetY,
  };
}

function parseIntParam(value, fallback, min = 1) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
}

function appendSvgText(svg, x, y, text, options = {}) {
  const el = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "text");
  el.setAttribute("x", String(x));
  el.setAttribute("y", String(y));
  el.setAttribute("font-family", "Georgia, 'Times New Roman', serif");
  el.setAttribute("font-size", String(options.fontSize ?? 14));
  el.setAttribute("fill", options.fill ?? "#2c2c2c");
  el.setAttribute("text-anchor", options.textAnchor ?? "middle");
  if (options.transform) {
    el.setAttribute("transform", options.transform);
  }
  el.textContent = text;
  svg.appendChild(el);
}

function drawDimensionArrow(rc, svg, from, to, label, labelOffset = { x: 0, y: -8 }) {
  const sketch = { stroke: "#444", strokeWidth: 1.2, roughness: 1.1, bowing: 0.6 };
  svg.appendChild(rc.line(from.x, from.y, to.x, to.y, sketch));

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const head = 6;

  for (const tip of [from, to]) {
    const sign = tip === from ? 1 : -1;
    const bx = tip.x + sign * ux * head;
    const by = tip.y + sign * uy * head;
    svg.appendChild(rc.line(tip.x, tip.y, bx + px * 4, by + py * 4, sketch));
    svg.appendChild(rc.line(tip.x, tip.y, bx - px * 4, by - py * 4, sketch));
  }

  appendSvgText(
    svg,
    (from.x + to.x) / 2 + labelOffset.x,
    (from.y + to.y) / 2 + labelOffset.y,
    label,
    { fontSize: 12, fill: "#555" },
  );
}

function generateSketch({ maxheight, setback, plotsize, title }) {
  const blockScale = 10;
  const margin = 60;
  const labelSpace = 50;

  const inner = plotsize - setback * 2;
  if (inner <= 0) {
    throw new Error("setback must be smaller than half of plotsize");
  }

  // Project plot extremes to compute bounding box and center the drawing.
  const corners = [
    project(0, 0, 0, blockScale, 0, 0),
    project(plotsize, 0, 0, blockScale, 0, 0),
    project(plotsize, maxheight, plotsize, blockScale, 0, 0),
    project(0, maxheight, plotsize, blockScale, 0, 0),
  ];

  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = maxX - minX + margin * 2;
  const height = maxY - minY + margin * 2 + labelSpace;
  const offsetX = margin - minX;
  const offsetY = margin - minY + labelSpace;

  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  const document = dom.window.document;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", String(Math.ceil(width)));
  svg.setAttribute("height", String(Math.ceil(height)));
  svg.setAttribute("viewBox", `0 0 ${Math.ceil(width)} ${Math.ceil(height)}`);
  document.body.appendChild(svg);

  const rc = rough.svg(svg);
  const gridStyle = { stroke: "#bbb", strokeWidth: 0.8, roughness: 0.8, bowing: 0.4 };
  const envelopeStyle = { stroke: "#2c3e50", strokeWidth: 2, roughness: 1.4, bowing: 1 };
  const setbackStyle = { stroke: "#c0392b", strokeWidth: 2.2, roughness: 1, bowing: 0.8 };

  const p = (x, y, z) => project(x, y, z, blockScale, offsetX, offsetY);

  // Ground-plane grid spanning the full plot (Y = 0).
  for (let i = 0; i <= plotsize; i++) {
    const a = p(i, 0, 0);
    const b = p(i, 0, plotsize);
    svg.appendChild(rc.line(a.x, a.y, b.x, b.y, gridStyle));

    const c = p(0, 0, i);
    const d = p(plotsize, 0, i);
    svg.appendChild(rc.line(c.x, c.y, d.x, d.y, gridStyle));
  }

  // Plot outline on the ground.
  const plotCorners = [
    p(0, 0, 0),
    p(plotsize, 0, 0),
    p(plotsize, 0, plotsize),
    p(0, 0, plotsize),
  ];
  for (let i = 0; i < 4; i++) {
    const a = plotCorners[i];
    const b = plotCorners[(i + 1) % 4];
    svg.appendChild(
      rc.line(a.x, a.y, b.x, b.y, {
        stroke: "#888",
        strokeWidth: 1.5,
        roughness: 1,
        bowing: 0.5,
      }),
    );
  }

  // Red setback exclusion zone on the ground.
  const setbackCorners = [
    p(setback, 0, setback),
    p(plotsize - setback, 0, setback),
    p(plotsize - setback, 0, plotsize - setback),
    p(setback, 0, plotsize - setback),
  ];
  for (let i = 0; i < 4; i++) {
    const a = setbackCorners[i];
    const b = setbackCorners[(i + 1) % 4];
    svg.appendChild(rc.line(a.x, a.y, b.x, b.y, setbackStyle));
  }

  // 3D building-envelope wireframe (valid build volume inside the setback).
  const x0 = setback;
  const x1 = plotsize - setback;
  const z0 = setback;
  const z1 = plotsize - setback;

  const bottom = [
    p(x0, 0, z0),
    p(x1, 0, z0),
    p(x1, 0, z1),
    p(x0, 0, z1),
  ];
  const top = [
    p(x0, maxheight, z0),
    p(x1, maxheight, z0),
    p(x1, maxheight, z1),
    p(x0, maxheight, z1),
  ];

  for (let i = 0; i < 4; i++) {
    svg.appendChild(
      rc.line(bottom[i].x, bottom[i].y, bottom[(i + 1) % 4].x, bottom[(i + 1) % 4].y, envelopeStyle),
    );
    svg.appendChild(
      rc.line(top[i].x, top[i].y, top[(i + 1) % 4].x, top[(i + 1) % 4].y, envelopeStyle),
    );
    svg.appendChild(rc.line(bottom[i].x, bottom[i].y, top[i].x, top[i].y, envelopeStyle));
  }

  // Dimension: setback along front edge.
  const setbackFrom = p(0, 0, setback / 2);
  const setbackTo = p(setback, 0, setback / 2);
  drawDimensionArrow(rc, svg, setbackFrom, setbackTo, `${setback} block setback`, { x: 0, y: -10 });

  // Dimension: max height along a vertical edge.
  const heightFrom = p(x1, 0, z1);
  const heightTo = p(x1, maxheight, z1);
  drawDimensionArrow(rc, svg, heightFrom, heightTo, `${maxheight} block max height`, { x: 14, y: 0 });

  // Title and plot summary.
  appendSvgText(svg, width / 2, 28, title, { fontSize: 20, fill: "#1a1a1a" });
  appendSvgText(
    svg,
    width / 2,
    48,
    `${plotsize}×${plotsize} plot · ${inner}×${inner} buildable footprint`,
    { fontSize: 12, fill: "#666" },
  );

  // Subtle paper background (inserted behind all drawn elements).
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", "0");
  bg.setAttribute("y", "0");
  bg.setAttribute("width", String(Math.ceil(width)));
  bg.setAttribute("height", String(Math.ceil(height)));
  bg.setAttribute("fill", "#faf8f5");
  svg.insertBefore(bg, svg.firstChild);

  return svg.outerHTML;
}

module.exports = (req, res) => {
  const maxheight = parseIntParam(req.query.maxheight, 25);
  const setback = parseIntParam(req.query.setback, 3);
  const plotsize = parseIntParam(req.query.plotsize, 16);
  const title =
    typeof req.query.title === "string" && req.query.title.trim()
      ? req.query.title.trim()
      : "Zoning Regulation";

  if (setback * 2 >= plotsize) {
    res.status(400).setHeader("Content-Type", "text/plain");
    res.end("setback must be less than half of plotsize");
    return;
  }

  try {
    const svg = generateSketch({ maxheight, setback, plotsize, title });

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
    res.status(200).end(svg);
  } catch (err) {
    res.status(500).setHeader("Content-Type", "text/plain");
    res.end(err instanceof Error ? err.message : "Failed to render sketch");
  }
};
