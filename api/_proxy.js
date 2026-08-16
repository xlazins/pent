'use strict';

module.exports = async function proxyToScanner(req, res, endpoint) {
  const scannerUrl = process.env.SCANNER_API_URL;
  if (!scannerUrl) {
    return res.status(503).json({
      error: 'The Strix worker is not configured. Set SCANNER_API_URL on Vercel.',
    });
  }

  const headers = { 'content-type': 'application/json' };
  if (process.env.SCANNER_API_TOKEN) {
    headers.authorization = `Bearer ${process.env.SCANNER_API_TOKEN}`;
  }

  try {
    const upstream = await fetch(new URL(endpoint, scannerUrl), {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body || {}),
      signal: AbortSignal.timeout(30_000),
    });
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader('content-type', upstream.headers.get('content-type') || 'application/json');
    return res.send(body);
  } catch (error) {
    return res.status(502).json({ error: `Strix worker is unreachable: ${error.message}` });
  }
};
