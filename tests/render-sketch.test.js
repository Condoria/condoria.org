const { describe, it, before } = require("node:test");
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

describe("render-sketch API", () => {
  it("returns valid SVG with default parameters", () => {
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
    assert.match(res.body, /3 block setback/);
    assert.match(res.body, /25 block max height/);
  });

  it("honors custom query parameters", () => {
    const res = callHandler({
      maxheight: "40",
      setback: "2",
      plotsize: "32",
      title: "Downtown Zoning",
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Downtown Zoning/);
    assert.match(res.body, /32×32 plot/);
    assert.match(res.body, /28×28 buildable footprint/);
    assert.match(res.body, /2 block setback/);
    assert.match(res.body, /40 block max height/);
  });

  it("includes roughjs sketch paths in SVG output", () => {
    const res = callHandler();
    assert.match(res.body, /<path[^>]+d="/);
  });

  it("includes setback boundary and envelope wireframe strokes", () => {
    const res = callHandler();
    assert.match(res.body, /#c0392b/);
    assert.match(res.body, /#2c3e50/);
  });

  it("rejects invalid setback with 400", () => {
    const res = callHandler({ plotsize: "10", setback: "6" });
    assert.equal(res.statusCode, 400);
    assert.match(res.body, /setback must be less than half of plotsize/);
  });

  it("falls back to defaults for non-numeric params", () => {
    const res = callHandler({
      maxheight: "abc",
      setback: "",
      plotsize: "-5",
      title: "   ",
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Zoning Regulation/);
    assert.match(res.body, /25 block max height/);
  });
});
