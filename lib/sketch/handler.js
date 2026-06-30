function sendSvg(res, svg) {
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
  res.status(200).end(svg);
}

function sendError(res, status, message) {
  res.status(status).setHeader("Content-Type", "text/plain");
  res.end(message);
}

function createApiHandler(handlerFn) {
  return function handler(req, res) {
    try {
      const svg = handlerFn(req.query);
      sendSvg(res, svg);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to render sketch";
      const status = /must be|required|requires|invalid|missing/i.test(message) ? 400 : 500;
      sendError(res, status, message);
    }
  };
}

module.exports = { sendSvg, sendError, createApiHandler };
