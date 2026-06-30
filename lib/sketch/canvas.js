const { JSDOM } = require("jsdom");
const rough = require("roughjs");

const SKETCH_TEXT = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fill: "#2c2c2c",
};

const CANVAS_PAD = 28;

function estimateTextWidth(text, fontSize) {
  return String(text).length * fontSize * 0.56;
}

function textBoundingBox(x, y, text, { fontSize = 14, textAnchor = "middle" }) {
  const width = estimateTextWidth(text, fontSize);
  const height = fontSize * 1.35;
  let left = x;
  if (textAnchor === "middle") {
    left = x - width / 2;
  } else if (textAnchor === "end") {
    left = x - width;
  }
  return { x: left, y: y - fontSize, width, height };
}

function createCanvas() {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  const document = dom.window.document;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  document.body.appendChild(svg);

  const rc = rough.svg(svg);
  const content = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svg.appendChild(content);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  function expandBounds(x, y, width = 0, height = 0) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  function appendText(x, y, text, options = {}) {
    const fontSize = options.fontSize ?? 14;
    const textAnchor = options.textAnchor ?? "middle";
    const box = textBoundingBox(x, y, text, { fontSize, textAnchor });
    expandBounds(box.x, box.y, box.width, box.height);

    const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
    el.setAttribute("x", String(x));
    el.setAttribute("y", String(y));
    el.setAttribute("font-family", options.fontFamily ?? SKETCH_TEXT.fontFamily);
    el.setAttribute("font-size", String(fontSize));
    el.setAttribute("fill", options.fill ?? SKETCH_TEXT.fill);
    el.setAttribute("text-anchor", textAnchor);
    if (options.opacity !== undefined) {
      el.setAttribute("opacity", String(options.opacity));
    }
    el.textContent = text;
    content.appendChild(el);
    return el;
  }

  function sketchLine(x1, y1, x2, y2, style = {}) {
    expandBounds(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
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
    expandBounds(x, y, w, h);
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
    expandBounds(x, y, w, h);
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

  function drawHeader(title, subtitle, centerX) {
    const cx = centerX ?? (minX !== Infinity ? (minX + maxX) / 2 : 200);
    appendText(cx, 28, title, { fontSize: 20, fill: "#1a1a1a" });
    if (subtitle) {
      appendText(cx, 48, subtitle, { fontSize: 12, fill: "#666666" });
    }
  }

  function toString({ diagramWidth } = {}) {
    if (!Number.isFinite(minX)) {
      minX = 0;
      minY = 0;
      maxX = 100;
      maxY = 100;
    }

    const height = Math.ceil(maxY - minY + CANVAS_PAD * 2);
    const shiftY = CANVAS_PAD - minY;

    let width;
    let shiftX;
    if (diagramWidth != null && Number.isFinite(diagramWidth)) {
      const diagramHalf = diagramWidth / 2;
      const padLeft = diagramHalf - minX;
      const padRight = maxX - diagramHalf;
      const halfSpan = Math.max(diagramHalf, padLeft, padRight);
      width = Math.ceil(halfSpan * 2 + CANVAS_PAD * 2);
      shiftX = CANVAS_PAD + halfSpan - diagramHalf;
    } else {
      width = Math.ceil(maxX - minX + CANVAS_PAD * 2);
      shiftX = CANVAS_PAD - minX;
    }

    content.setAttribute("transform", `translate(${shiftX} ${shiftY})`);

    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", "0");
    bg.setAttribute("y", "0");
    bg.setAttribute("width", String(width));
    bg.setAttribute("height", String(height));
    bg.setAttribute("fill", "#faf8f5");
    svg.insertBefore(bg, content);

    return svg.outerHTML;
  }

  function getContentCenterX() {
    if (!Number.isFinite(minX)) {
      return 0;
    }
    return (minX + maxX) / 2;
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
    getContentCenterX,
    toString,
  };
}

module.exports = {
  createCanvas,
  SKETCH_TEXT,
  estimateTextWidth,
  textBoundingBox,
  CANVAS_PAD,
};
