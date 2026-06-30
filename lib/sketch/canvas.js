const { JSDOM } = require("jsdom");
const rough = require("roughjs");

const SKETCH_TEXT = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fill: "#2c2c2c",
};

function createCanvas({ width, height }) {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  const document = dom.window.document;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", String(Math.ceil(width)));
  svg.setAttribute("height", String(Math.ceil(height)));
  svg.setAttribute("viewBox", `0 0 ${Math.ceil(width)} ${Math.ceil(height)}`);
  document.body.appendChild(svg);

  const rc = rough.svg(svg);
  const content = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svg.appendChild(content);

  function appendText(x, y, text, options = {}) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
    el.setAttribute("x", String(x));
    el.setAttribute("y", String(y));
    el.setAttribute("font-family", options.fontFamily ?? SKETCH_TEXT.fontFamily);
    el.setAttribute("font-size", String(options.fontSize ?? 14));
    el.setAttribute("fill", options.fill ?? SKETCH_TEXT.fill);
    el.setAttribute("text-anchor", options.textAnchor ?? "middle");
    if (options.opacity !== undefined) {
      el.setAttribute("opacity", String(options.opacity));
    }
    el.textContent = text;
    content.appendChild(el);
    return el;
  }

  function sketchLine(x1, y1, x2, y2, style = {}) {
    content.appendChild(
      rc.line(x1, y1, x2, y2, {
        stroke: "#444444",
        strokeWidth: 1.2,
        roughness: 1.1,
        bowing: 0.6,
        ...style,
      }),
    );
  }

  function sketchRect(x, y, w, h, style = {}) {
    const node = rc.rectangle(x, y, w, h, {
      stroke: "#444444",
      strokeWidth: 1.2,
      roughness: 1.1,
      bowing: 0.5,
      fill: "none",
      ...style,
    });
    content.appendChild(node);
    return node;
  }

  function fillRect(x, y, w, h, fill, opacity) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    el.setAttribute("x", String(x));
    el.setAttribute("y", String(y));
    el.setAttribute("width", String(w));
    el.setAttribute("height", String(h));
    el.setAttribute("fill", fill);
    if (opacity !== undefined) {
      el.setAttribute("fill-opacity", String(opacity));
    }
    content.appendChild(el);
    return el;
  }

  function drawHeader(title, subtitle) {
    appendText(width / 2, 28, title, { fontSize: 20, fill: "#1a1a1a" });
    if (subtitle) {
      appendText(width / 2, 48, subtitle, { fontSize: 12, fill: "#666666" });
    }
  }

  function drawBackground() {
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", "0");
    bg.setAttribute("y", "0");
    bg.setAttribute("width", String(Math.ceil(width)));
    bg.setAttribute("height", String(Math.ceil(height)));
    bg.setAttribute("fill", "#faf8f5");
    svg.insertBefore(bg, svg.firstChild);
  }

  function toString() {
    drawBackground();
    return svg.outerHTML;
  }

  return {
    svg,
    content,
    rc,
    document,
    appendText,
    sketchLine,
    sketchRect,
    fillRect,
    drawHeader,
    toString,
  };
}

module.exports = { createCanvas, SKETCH_TEXT };
