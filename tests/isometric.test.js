const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const rough = require("roughjs");

const { project } = require("../lib/sketch/render-3d");

describe("isometric projection math", () => {
  it("maps origin to offset point", () => {
    const p = project(0, 0, 0, 10, 100, 200);
    assert.equal(p.x, 100);
    assert.equal(p.y, 200);
  });

  it("increases screen Y when world Y decreases (height goes up)", () => {
    const ground = project(5, 0, 5, 10, 0, 0);
    const elevated = project(5, 10, 5, 10, 0, 0);
    assert.ok(elevated.y < ground.y, "higher blocks should render higher on screen");
  });

  it("produces four distinct corner points for a unit square", () => {
    const corners = [
      project(0, 0, 0, 10, 0, 0),
      project(1, 0, 0, 10, 0, 0),
      project(1, 0, 1, 10, 0, 0),
      project(0, 0, 1, 10, 0, 0),
    ];
    const keys = new Set(corners.map((c) => `${c.x},${c.y}`));
    assert.equal(keys.size, 4);
  });
});

describe("roughjs + jsdom integration", () => {
  it("renders sketchy SVG lines server-side", () => {
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    const svg = dom.window.document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    const rc = rough.svg(svg);
    svg.appendChild(rc.line(0, 0, 100, 100, { roughness: 1.5 }));
    const html = svg.outerHTML;
    assert.match(html, /<path/);
    assert.match(html, /d="/);
  });
});
