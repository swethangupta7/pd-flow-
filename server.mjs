#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile, writeFile, stat, mkdir, unlink, copyFile, chmod } from 'node:fs/promises';
import { existsSync, unlinkSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const argPort = process.argv.slice(2).find((a) => /^\d+$/.test(a));
const PORT = Math.min(65535, Math.max(1024, Number(argPort || process.env.PORT || 5173) || 5173));
const HOST = process.env.HOST || '127.0.0.1';
const QUIET = process.argv.includes('--quiet');
const NO_OPEN = process.argv.includes('--no-open');
let port = PORT;
let triesLeft = 20;

const BOLD = '\x1b[1m', CYAN = '\x1b[36m', GREEN = '\x1b[32m', DIM = '\x1b[2m', RESET = '\x1b[0m';
const say = (...a) => { if (!QUIET) console.log(...a); };

const RUNTIME = join(ROOT, '.runtime.json');
const HOME = homedir();
const AUTOSTART_DIR = join(HOME, '.config', 'autostart');
const AUTOSTART_FILE = join(AUTOSTART_DIR, 'pd-flow-lab.desktop');
const ICON_SRC = join(ROOT, 'PD-Flow-Lab.desktop');
const ICON_DST = join(HOME, 'Desktop', 'PD-Flow-Lab.desktop');
const APPS_FILE = join(HOME, '.local', 'share', 'applications', 'pd-flow-lab.desktop');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.map': 'application/json; charset=utf-8',
};

async function accessState() {
  return {
    app: 'pd-flow-lab',
    pid: process.pid,
    port,
    url: `http://${HOST}:${port}/`,
    autostart: existsSync(AUTOSTART_FILE),
    desktopIcon: existsSync(ICON_DST),
    menuEntry: existsSync(APPS_FILE),
    folder: ROOT,
  };
}

function json(res, code, body) {
  const s = JSON.stringify(body);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(s);
}

function readBody(req) {
  return new Promise((done) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 8192) req.destroy(); });
    req.on('end', () => { try { done(JSON.parse(raw || '{}')); } catch { done({}); } });
    req.on('error', () => done({}));
  });
}

// Local-only control endpoint: a custom header forces a CORS preflight we never
// answer, so a random web page cannot stop the server or change login items.
function guarded(req) {
  return req.headers['x-pd-lab'] === '1' &&
    (!req.headers.origin || req.headers.origin === `http://${HOST}:${port}`);
}

async function setAutostart(on) {
  if (on) {
    await mkdir(AUTOSTART_DIR, { recursive: true });
    const src = await readFile(ICON_SRC, 'utf8');
    await writeFile(AUTOSTART_FILE, src.replace(/^Terminal=true$/m, 'Terminal=false'), 'utf8');
    await chmod(AUTOSTART_FILE, 0o755);
  } else if (existsSync(AUTOSTART_FILE)) {
    await unlink(AUTOSTART_FILE);
  }
}

async function placeIcons() {
  const src = await readFile(ICON_SRC, 'utf8');
  const silent = src.replace(/^Terminal=true$/m, 'Terminal=false');
  await writeFile(ICON_SRC, silent, 'utf8');
  await chmod(ICON_SRC, 0o755);
  await mkdir(join(HOME, '.local', 'share', 'applications'), { recursive: true });
  await writeFile(APPS_FILE, silent, 'utf8');
  await chmod(APPS_FILE, 0o755);
  if (existsSync(join(HOME, 'Desktop'))) {
    await copyFile(ICON_SRC, ICON_DST);
    await chmod(ICON_DST, 0o755);
    const mark = spawn('gio', ['set', ICON_DST, 'metadata::trusted', 'true'], { stdio: 'ignore' });
    mark.on('error', () => {});
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;

    if (path === '/__status') return json(res, 200, await accessState());

    if (path === '/__shutdown' && req.method === 'POST') {
      if (!guarded(req)) return json(res, 403, { error: 'local requests only' });
      json(res, 200, { stopping: true });
      setTimeout(() => { cleanup(); process.exit(0); }, 60);
      return;
    }

    if (path === '/__access' && req.method === 'POST') {
      if (!guarded(req)) return json(res, 403, { error: 'local requests only' });
      const body = await readBody(req);
      if (typeof body.autostart === 'boolean') await setAutostart(body.autostart);
      if (body.icons === true) await placeIcons();
      return json(res, 200, await accessState());
    }

    let rel = decodeURIComponent(path);
    if (rel === '/' || rel === '') rel = '/index.html';
    const target = resolve(join(ROOT, normalize(rel)));
    if (!target.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
    let file = target;
    const info = await stat(file).catch(() => null);
    if (info && info.isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file).catch(() => null);
    if (!body) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('404 — not found: ' + rel);
      return;
    }
    res.writeHead(200, {
      'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('500 — ' + err.message);
  }
});

function cleanup() {
  try { if (existsSync(RUNTIME)) unlinkSync(RUNTIME); } catch { /* already gone */ }
}
process.on('exit', cleanup);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { cleanup(); process.exit(0); });

function openBrowser(target) {
  if (NO_OPEN) return;
  const list = process.platform === 'darwin' ? [['open', [target]]]
    : process.platform === 'win32' ? [['cmd', ['/c', 'start', '', target]]]
      : [['xdg-open', [target]], ['gio', ['open', target]], ['firefox', [target]], ['google-chrome', [target]], ['sensible-browser', [target]]];
  const attempt = (i) => {
    if (i >= list.length) { say(`  Open this in your browser:  ${target}`); return; }
    const [cmd, args] = list[i];
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => attempt(i + 1));
    child.unref();
  };
  attempt(0);
}

async function alreadyRunning() {
  for (let p = PORT; p < PORT + 20; p++) {
    try {
      const r = await fetch(`http://${HOST}:${p}/__status`, { signal: AbortSignal.timeout(350) });
      const j = await r.json();
      if (j && j.app === 'pd-flow-lab') return j;
    } catch { /* nothing there */ }
  }
  return null;
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && triesLeft > 0) {
    triesLeft--;
    say(`  Port ${port} is busy — trying ${port + 1}…`);
    port++;
    setTimeout(() => server.listen(port, HOST), 120);
    return;
  }
  console.error(`\n  No free port near ${PORT}. Close the other PD Flow Lab window and try again.\n`);
  process.exit(1);
});

const running = await alreadyRunning();
if (running) {
  say(`\n  ${GREEN}Already running.${RESET} Opening ${BOLD}${running.url}${RESET}\n`);
  openBrowser(running.url);
  process.exit(0);
}

server.listen(port, HOST, async () => {
  const url = `http://${HOST}:${port}/`;
  await writeFile(RUNTIME, JSON.stringify({ pid: process.pid, port, url }, null, 2), 'utf8').catch(() => {});
  say('  ─────────────────────────────────────────');
  say(`  ${BOLD}${CYAN}PD FLOW LAB${RESET}   ${BOLD}${url}${RESET}`);
  say('  ─────────────────────────────────────────');
  say(`  ${GREEN}Your browser is opening now.${RESET}`);
  say(`  ${DIM}Stop it from the power button in the page, or Ctrl + C here.${RESET}\n`);
  openBrowser(url);
});