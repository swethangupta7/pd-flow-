// Talks to the tiny local control API in server.mjs. Everything here is
// loopback-only; if the page is opened without the server, it degrades to
// showing the command instead of pretending the controls work.
const HDR = { 'x-pd-lab': '1', 'content-type': 'application/json' };

export async function getStatus() {
  try {
    const r = await fetch('/__status', { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.app === 'pd-flow-lab' ? j : null;
  } catch { return null; }
}

async function post(path, body) {
  const r = await fetch(path, { method: 'POST', headers: HDR, body: JSON.stringify(body || {}) });
  if (!r.ok) throw new Error('local server refused the request');
  return r.json();
}

export const setAutostart = (on) => post('/__access', { autostart: on });
export const placeIcons = () => post('/__access', { icons: true });
export const shutdown = () => post('/__shutdown', {});

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}