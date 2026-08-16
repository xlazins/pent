'use strict';

const proxyToScanner = require('./_proxy');

module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  return proxyToScanner(req, res, '/api/scan');
};
