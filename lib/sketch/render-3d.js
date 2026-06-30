const { JSDOM } = require("jsdom");
const rough = require("roughjs");

const ISO_X = Math.cos(Math.PI / 6);
const ISO_Z = Math.sin(Math.PI / 6);

function project(x, y, z, scale, offsetX, offsetY) {
  return {
    x: (x - z) * ISO_X * scale + offsetX,
    y: (x + z) * ISO_Z * scale - y * scale + offsetY,
  };
}

function appendSvgText(svg, x, y, text, options = {}) {
  const el = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "text");
  el.setAttribute("x", String(x));
  el.setAttribute("y", String(y));
  el.setAttribute("font-family", "Georgia, 'Times New Roman', serif");
  el.setAttribute("font-size", String(options.fontSize ?? 14));
  el.setAttribute("fill", options.fill ?? "#2c2c2c");
  el.setAttribute("text-anchor", options.textAnchor ?? "middle");
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

function collectProjectedPoints({ width, depth, maxheight, setback, blockScale }) {
  const points = [];
  const add = (x, y, z) => points.push(project(x, y, z, blockScale, 0, 0));

  for (let i = 0; i <= width; i++) {
    add(i, 0, 0);
    add(i, 0, depth);
    add(i, maxheight, 0);
    add(i, maxheight, depth);
  }
  for (let i = 0; i <= depth; i++) {
    add(0, 0, i);
    add(width, 0, i);
    add(0, maxheight, i);
    add(width, maxheight, i);
  }

  const x0 = setback;
  const x1 = width - setback;
  const z0 = setback;
  const z1 = depth - setback;
  for (const y of [0, maxheight]) {
    add(x0, y, z0);
    add(x1, y, z0);
    add(x1, y, z1);
    add(x0, y, z1);
  }

  add(0, 0, setback / 2);
  add(setback, 0, setback / 2);
  add(x1, 0, z1);
  add(x1, maxheight, z1);

  return points;
}

function generateSketch3d({ maxheight, setback, width, depth, title }) {
  const blockScale = 10;
  const margin = 80;
  const labelSpace = 56;
  const arrowPad = 24;

  const innerW = width - setback * 2;
  const innerD = depth - setback * 2;
  if (innerW <= 0 || innerD <= 0) {
    throw new Error("setback must be smaller than half of width and depth");
  }

  const projected = collectProjectedPoints({ width, depth, maxheight, setback, blockScale });
  const xs = projected.map((p) => p.x);
  const ys = projected.map((p) => p.y);
  const minX = Math.min(...xs) - arrowPad;
  const maxX = Math.max(...xs) + arrowPad;
  const minY = Math.min(...ys) - arrowPad;
  const maxY = Math.max(...ys) + arrowPad;

  const contentW = maxX - minX;
  const contentH = maxY - minY;
  const svgW = contentW + margin * 2;
  const svgH = contentH + margin * 2 + labelSpace;
  const offsetX = margin - minX;
  const offsetY = margin - minY + labelSpace;

  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  const document = dom.window.document;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", String(Math.ceil(svgW)));
  svg.setAttribute("height", String(Math.ceil(svgH)));
  svg.setAttribute("viewBox", `0 0 ${Math.ceil(svgW)} ${Math.ceil(svgH)}`);
  document.body.appendChild(svg);

  const rc = rough.svg(svg);
  const gridStyle = { stroke: "#bbb", strokeWidth: 0.8, roughness: 0.8, bowing: 0.4 };
  const envelopeStyle = { stroke: "#2c3e50", strokeWidth: 2, roughness: 1.4, bowing: 1 };
  const setbackStyle = { stroke: "#c0392b", strokeWidth: 2.2, roughness: 1, bowing: 0.8 };
  const p = (x, y, z) => project(x, y, z, blockScale, offsetX, offsetY);

  for (let i = 0; i <= width; i++) {
    const a = p(i, 0, 0);
    const b = p(i, 0, depth);
    svg.appendChild(rc.line(a.x, a.y, b.x, b.y, gridStyle));
    const c = p(0, 0, i);
    const d = p(width, 0, i);
    svg.appendChild(rc.line(c.x, c.y, d.x, d.y, gridStyle));
  }

  const plotCorners = [p(0, 0, 0), p(width, 0, 0), p(width, 0, depth), p(0, 0, depth)];
  for (let i = 0; i < 4; i++) {
    const a = plotCorners[i];
    const b = plotCorners[(i + 1) % 4];
    svg.appendChild(rc.line(a.x, a.y, b.x, b.y, { stroke: "#888", strokeWidth: 1.5, roughness: 1, bowing: 0.5 }));
  }

  const setbackCorners = [
    p(setback, 0, setback),
    p(width - setback, 0, setback),
    p(width - setback, 0, depth - setback),
    p(setback, 0, depth - setback),
  ];
  for (let i = 0; i < 4; i++) {
    const a = setbackCorners[i];
    const b = setbackCorners[(i + 1) % 4];
    svg.appendChild(rc.line(a.x, a.y, b.x, b.y, setbackStyle));
  }

  const x0 = setback;
  const x1 = width - setback;
  const z0 = setback;
  const z1 = depth - setback;
  const bottom = [p(x0, 0, z0), p(x1, 0, z0), p(x1, 0, z1), p(x0, 0, z1)];
  const top = [p(x0, maxheight, z0), p(x1, maxheight, z0), p(x1, maxheight, z1), p(x0, maxheight, z1)];

  for (let i = 0; i < 4; i++) {
    svg.appendChild(rc.line(bottom[i].x, bottom[i].y, bottom[(i + 1) % 4].x, bottom[(i + 1) % 4].y, envelopeStyle));
    svg.appendChild(rc.line(top[i].x, top[i].y, top[(i + 1) % 4].x, top[(i + 1) % 4].y, envelopeStyle));
    svg.appendChild(rc.line(bottom[i].x, bottom[i].y, top[i].x, top[i].y, envelopeStyle));
  }

  drawDimensionArrow(rc, svg, p(0, 0, setback / 2), p(setback, 0, setback / 2), `${setback} block setback`, { x: 0, y: -10 });
  drawDimensionArrow(rc, svg, p(x1, 0, z1), p(x1, maxheight, z1), `${maxheight} block max height`, { x: 14, y: 0 });

  appendSvgText(svg, svgW / 2, 28, title, { fontSize: 20, fill: "#1a1a1a" });
  appendSvgText(svg, svgW / 2, 48, `${width}×${depth} plot · ${innerW}×${innerD} buildable footprint`, { fontSize: 12, fill: "#666" });

  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", "0");
  bg.setAttribute("y", "0");
  bg.setAttribute("width", String(Math.ceil(svgW)));
  bg.setAttribute("height", String(Math.ceil(svgH)));
  bg.setAttribute("fill", "#faf8f5");
  svg.insertBefore(bg, svg.firstChild);

  return svg.outerHTML;
}

module.exports = { generateSketch3d, project };
