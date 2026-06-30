const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const handler = require("../pages/api/render-sketch");

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

describe("render-sketch API (2D)", () => {
  it("returns valid plan view SVG with defaults", () => {
    const res = callHandler();
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers["content-type"], "image/svg+xml");
    assert.equal(
      res.headers["cache-control"],
      "s-maxage=86400, stale-while-revalidate",
    );
    assert.match(res.body, /^<svg[\s\S]*<\/svg>$/);
    assert.match(res.body, /Zoning Regulation/);
    assert.match(res.body, /16×16 plot/);
    assert.match(res.body, /10×10 buildable/);
  });

  it("supports rectangular plots via width and depth", () => {
    const res = callHandler({
      width: "24",
      depth: "12",
      setback: "2",
      title: "Harbor Lot",
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Harbor Lot/);
    assert.match(res.body, /24×12 plot/);
    assert.match(res.body, /20×8 buildable/);
  });

  it("renders elevation view with over-limit block", () => {
    const res = callHandler({
      view: "elevation",
      maxheight: "32",
      showover: "1",
      title: "Height Limit",
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Height Limit/);
    assert.match(res.body, /max 32 blocks/);
    assert.match(res.body, /fill-opacity="0.5"/);
    assert.match(res.body, /not allowed/);
  });

  it("renders material grid for rails pattern", () => {
    const res = callHandler({
      view: "grid",
      rows: "xoxox|o-o-o",
      title: "Rail Pattern",
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Rail Pattern/);
    assert.match(res.body, /wooden slab/);
    assert.match(res.body, /polished deepslate/);
    assert.match(res.body, /<path[^>]+d="/);
  });

  it("accepts spaced grid rows", () => {
    const res = callHandler({
      rows: "x o x o x| - o - o -",
      title: "Spaced Rails",
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Spaced Rails/);
  });

  it("rejects invalid setback with 400", () => {
    const res = callHandler({ width: "10", depth: "10", setback: "6" });
    assert.equal(res.statusCode, 400);
    assert.match(res.body, /setback must be smaller than half of width and depth/);
  });

  it("requires rows for grid view", () => {
    const res = callHandler({ view: "grid" });
    assert.equal(res.statusCode, 400);
    assert.match(res.body, /requires rows or grid parameter/);
  });
});
