require('dotenv').config();
const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 4000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const DASHBOARD_TOKEN = process.env.DASHBOARD_TOKEN || '';

app.use('/api', (req, res, next) => {
  if (!DASHBOARD_TOKEN) return next();
  if (req.get('authorization') !== `Bearer ${DASHBOARD_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
});

// Keep it simple: one scan at a time, in-memory state.
let scanState = {
  running: false,
  logs: [],
  rawReport: '',
  plainReport: '',
  error: null,
  finishedAt: null,
};

function resetState() {
  scanState = {
    running: true,
    logs: [],
    rawReport: '',
    plainReport: '',
    error: null,
    finishedAt: null,
  };
}

// Stream current state to the browser (simple polling endpoint, no websockets needed for v1)
app.get('/api/status', (req, res) => {
  res.json(scanState);
});

app.post('/api/scan', (req, res) => {
  const { target, confirmedOwnership } = req.body;

  if (!target || !target.trim()) {
    return res.status(400).json({ error: 'Target is required.' });
  }
  if (target.length > 2048 || /[\u0000-\u001f\u007f]/.test(target)) {
    return res.status(400).json({ error: 'Target is invalid.' });
  }
  if (!confirmedOwnership) {
    return res.status(400).json({
      error: 'You must confirm you own or have explicit permission to scan this target.',
    });
  }
  if (scanState.running) {
    return res.status(409).json({ error: 'A scan is already running.' });
  }
  if (!process.env.STRIX_LLM || !process.env.LLM_API_KEY) {
    return res.status(400).json({
      error: 'STRIX_LLM and LLM_API_KEY must be set in your .env file before scanning.',
    });
  }

  resetState();
  res.json({ started: true });

  // Run strix in headless/non-interactive mode, quick scan mode for a faster first test.
  // Adjust flags any time from this one place.
  const args = ['-n', '--target', target.trim(), '--scan-mode', 'quick'];
  const child = spawn('strix', args, {
    env: process.env,
    shell: false,
  });

  child.stdout.on('data', (data) => {
    const text = data.toString();
    scanState.logs.push(text);
    scanState.rawReport += text;
  });

  child.stderr.on('data', (data) => {
    const text = data.toString();
    scanState.logs.push(text);
  });

  child.on('error', (err) => {
    scanState.running = false;
    scanState.error = `Failed to start strix: ${err.message}. Is the Strix CLI installed and on your PATH?`;
    scanState.finishedAt = Date.now();
  });

  child.on('close', async (code) => {
    scanState.running = false;
    scanState.finishedAt = Date.now();

    if (!scanState.rawReport.trim()) {
      scanState.error = scanState.error || 'Strix produced no output. Check that Docker is running.';
      return;
    }

    try {
      scanState.plainReport = await translateToPlainEnglish(scanState.rawReport);
    } catch (err) {
      scanState.plainReport = `(Translation step failed: ${err.message}. Raw report is still available below.)`;
    }
  });
});

async function translateToPlainEnglish(rawReport) {
  if (!GEMINI_API_KEY) {
    return '(Set GEMINI_API_KEY in .env to enable plain-English translation.)';
  }

  const prompt = `You are explaining a security scan report to someone who built an app with AI tools but is not a security expert and does not know terms like IDOR, SSRF, or XSS.

For each vulnerability found in the report below:
1. Name it in plain language (what could actually happen to a user or the business)
2. Explain why it matters, in one or two sentences, no jargon
3. Give a simple next step (e.g. "ask your AI coding tool to add authentication checks on this endpoint")

Skip anything that isn't a real, validated finding. Be direct and concise, not alarmist.

Report:
${rawReport.slice(0, 30000)}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text returned from Gemini.');
  return text;
}

app.listen(PORT, () => {
  console.log(`\nDashboard running at http://localhost:${PORT}\n`);
});
