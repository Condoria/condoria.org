const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const handler = require("../pages/api/render-sketch-3d");

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

describe("render-sketch-3d API (deprecated)", () => {
  it("returns isometric SVG with default parameters", () => {
    const res = callHandler();
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers["content-type"], "image/svg+xml");
    assert.match(res.body, /^<svg[\s\S]*<\/svg>$/);
    assert.match(res.body, /Zoning Regulation/);
    assert.match(res.body, /16×16 plot/);
    assert.match(res.body, /3 block setback/);
    assert.match(res.body, /25 block max height/);
  });

  it("supports rectangular plots", () => {
    const res = callHandler({
      width: "32",
      depth: "16",
      setback: "2",
      maxheight: "40",
      title: "Downtown Zoning",
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Downtown Zoning/);
    assert.match(res.body, /32×16 plot/);
    assert.match(res.body, /28×12 buildable footprint/);
  });
});
