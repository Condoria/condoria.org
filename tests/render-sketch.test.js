const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const handler = require("../pages/api/render-sketch");
const { serializeStylesParam } = require("../lib/sketch/style-codec");

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: "",
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    end(body) {
      this.body = body ?? "";
      return this;
    },
  };
  return res;
}

function callHandler(query = {}) {
  const req = { query };
  const res = mockRes();
  handler(req, res);
  return res;
}

const RAIL_STYLES = serializeStylesParam({
  a: { fill: "#a67c52", stroke: "#6b4f2a", opacity: 1, label: "wooden slab" },
  b: { fill: "#4a5568", stroke: "#2d3748", opacity: 1, label: "polished deepslate" },
});

describe("render-sketch API (grid)", () => {
  it("returns valid grid SVG with dynamic styles", () => {
    const res = callHandler({
      rows: "ababa|-b-b-",
      styles: RAIL_STYLES,
      title: "Rail Pattern",
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Rail Pattern/);
    assert.match(res.body, /wooden slab/);
    assert.match(res.body, /polished deepslate/);
    assert.match(res.body, /- · empty/);
  });

  it("keeps first row at the top of the sketch", () => {
    const res = callHandler({
      rows: "aaa|bbb",
      styles: RAIL_STYLES,
      title: "Row Order",
    });
    assert.match(res.body, /Row Order/);
    const fillsA = [...res.body.matchAll(/fill="#a67c52"/g)].length;
    const fillsB = [...res.body.matchAll(/fill="#4a5568"/g)].length;
    assert.ok(fillsA >= 3);
    assert.ok(fillsB >= 3);
  });

  it("applies plan overlay as a feature", () => {
    const res = callHandler({
      rows: "---------|---------|---------|---------",
      styles: RAIL_STYLES,
      plan: "1",
      width: "4",
      depth: "4",
      setback: "1",
      title: "Plan Overlay",
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /2×2 buildable/);
    assert.match(res.body, /4×4 plot/);
  });

  it("applies elevation column as a feature", () => {
    const res = callHandler({
      rows: "ababa",
      styles: RAIL_STYLES,
      elevation: "1",
      maxheight: "8",
      showover: "1",
      title: "With Elevation",
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /max 8/);
    assert.match(res.body, /not allowed/);
    assert.match(res.body, /fill-opacity="0.5"/);
  });

  it("auto-generates empty grid when only plan is provided", () => {
    const res = callHandler({
      plan: "1",
      width: "6",
      depth: "4",
      setback: "1",
      title: "Empty Plan",
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Empty Plan/);
    assert.match(res.body, /4×2 buildable/);
  });

  it("rejects invalid setback with 400", () => {
    const res = callHandler({
      rows: "aaaa",
      plan: "1",
      width: "4",
      depth: "4",
      setback: "3",
    });
    assert.equal(res.statusCode, 400);
    assert.match(res.body, /Setback \(3 blocks\) must be less than half the plot width on the grid \(4 blocks\)/);
  });

  it("rejects setback when plot is clipped to a small grid", () => {
    const res = callHandler({
      rows: "ababa|-b-b-",
      styles: RAIL_STYLES,
      plan: "1",
      width: "16",
      depth: "16",
      setback: "3",
    });
    assert.equal(res.statusCode, 400);
    assert.match(res.body, /plot width on the grid \(5 blocks\)/);
  });

  it("requires rows when plan is disabled", () => {
    const res = callHandler({ title: "No grid" });
    assert.equal(res.statusCode, 400);
    assert.match(res.body, /rows or grid parameter is required/);
  });
});
