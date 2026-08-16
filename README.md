# Strix Dashboard

A one-click wrapper around [Strix](https://github.com/usestrix/strix) that also
translates its findings into plain English.

Strix requires a Linux machine with a running Docker daemon. Vercel can host the
dashboard, but the scan process itself must run on a separate Docker worker.

## Prerequisites (do these first)

1. **Docker Desktop** installed and running — https://www.docker.com
2. **Node.js** installed (v18+) — https://nodejs.org
3. **Strix CLI** installed:
   ```
   curl -sSL https://strix.ai/install | bash
   ```
4. A **free LLM API key** — e.g. Gemini, from https://aistudio.google.com (no credit card needed)

## Setup

```bash
cd strix-dashboard
npm install
cp .env.example .env
```

Open `.env` and fill in your keys:

```
STRIX_LLM=gemini/gemini-2.5-flash
LLM_API_KEY=your-key-here
GEMINI_API_KEY=your-gemini-key-here
```

## Run it

```bash
npm start
```

Then open **http://localhost:4000** in your browser.

## GitHub Codespaces

This repository includes a dev container that installs Docker-in-Docker, Node,
Python, Strix, and the npm dependencies. Create a Codespace on `main`, then run:

```bash
docker version
cp .env.example .env
# edit .env and add your own key
npm start
```

## Vercel frontend + Docker worker

Deploy this repository to Vercel and configure:

```text
SCANNER_API_URL=https://your-linux-docker-worker.example
SCANNER_API_TOKEN=a-long-random-value
```

Configure the worker with the same value as `DASHBOARD_TOKEN`, plus
`STRIX_LLM`, `LLM_API_KEY`, and `GEMINI_API_KEY`. The token keeps users from
calling the worker directly. Do not commit `.env`.

The worker still needs target-ownership verification and network egress rules
before it is safe to expose as a public multi-user service. A checkbox alone is
appropriate only for personal use.

## Using it

1. Enter a target: a URL you're allowed to test, a local folder path (e.g. `./my-app`), or a
   public GitHub repo URL you have permission to scan.
2. Check the authorization box. **Only scan things you own or have explicit permission to test —
   this is a legal requirement, not a formality.**
3. Click "Run Scan" and watch the live logs. This can take a while for a real target since
   Strix is actively probing, not just pattern-matching.
4. When it finishes, check the **Plain English** tab first — this is the part worth judging
   honestly. If it still reads too technical, that's useful information: it means the
   translation prompt in `server.js` (see the `translateToPlainEnglish` function) needs work
   before this is a real product, not just a personal tool.

## What this is NOT (yet)

- Not multi-user — one scan at a time, no accounts, no auth
- Not hosted — nobody else can use this unless it's running on their own machine too
- Not verified for target ownership beyond a checkbox — a real product needs a stronger
  check (e.g. a DNS TXT record challenge) before scanning other people's domains

Those are the pieces you'd add later, only if the plain-English output turns out to
actually be worth building a real product around.
