const { setCors } = require("../_lib/monad");

module.exports = function handler(req, res) {
    setCors(res);
    if (req.method === "OPTIONS") return res.status(200).end();

    // Standard Vercel serverless can't do persistent SSE, so return immediate OK
    // Frontend already handles this gracefully — falls back if SSE not available
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write(`data: ${JSON.stringify({ step: "connected", status: "ok", detail: null, timing: 0 })}\n\n`);
    // End the response — frontend will proceed without SSE
    res.end();
};
