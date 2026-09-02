const { COOKIE_NAME, verifySession, parseCookies } = require('../lib/session');

// Apps Script sheet reads routinely take 4-10s. Kept under the 30s function
// maxDuration so the proxy returns a clean error rather than being killed.
const FETCH_TIMEOUT = 25000;

// Actions the public kiosk may call. Anything not listed here is rejected
// before it reaches the backend.
const PUBLIC_ACTIONS = new Set([
  'getAll', 'search', 'stats', 'checkAttendance',
  'markAttendance', 'updateContact', 'addAlumni'
]);

// Actions that expose or destroy event data — admin session required.
const ADMIN_ACTIONS = new Set(['attendance', 'resetAttendance']);

// Only these may be cached; admin responses are always no-store.
const CACHEABLE_ACTIONS = new Set(['getAll', 'stats', 'search', 'checkAttendance']);

module.exports = async function handler(req, res) {
  const action = String((req.query && req.query.action) || '');

  res.setHeader('X-Content-Type-Options', 'nosniff');

  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
  const APPS_SCRIPT_TOKEN = process.env.APPS_SCRIPT_TOKEN;

  if (!APPS_SCRIPT_URL || !APPS_SCRIPT_TOKEN) {
    console.error('APPS_SCRIPT_URL / APPS_SCRIPT_TOKEN is not set');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).json({ success: false, error: 'Server not configured' });
  }

  if (!PUBLIC_ACTIONS.has(action) && !ADMIN_ACTIONS.has(action)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ success: false, error: 'Unknown action' });
  }

  if (ADMIN_ACTIONS.has(action)) {
    const cookies = parseCookies(req.headers.cookie);
    if (!verifySession(cookies[COOKIE_NAME], process.env.SESSION_SECRET)) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  }

  const url = new URL(APPS_SCRIPT_URL);
  for (const [k, v] of Object.entries(req.query || {})) {
    if (k === 'token') continue; // never let a caller supply their own
    url.searchParams.set(k, v);
  }
  url.searchParams.set('token', APPS_SCRIPT_TOKEN);

  const options = { method: req.method, redirect: 'follow' };
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    let parsed;
    try { parsed = JSON.parse(body); } catch { parsed = {}; }
    parsed.token = APPS_SCRIPT_TOKEN;
    options.headers = { 'Content-Type': 'text/plain' };
    options.body = JSON.stringify(parsed);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  options.signal = controller.signal;

  try {
    const response = await fetch(url.toString(), options);
    clearTimeout(timeout);
    const data = await response.text();

    if (!response.ok || data.startsWith('<!DOCTYPE')) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(502).json({ success: false, error: 'Backend unavailable' });
    }

    res.setHeader('Content-Type', 'application/json');
    if (CACHEABLE_ACTIONS.has(action)) {
      const sMax = action === 'getAll' ? 120 : 30;
      const browserMax = action === 'getAll' ? 60 : 15;
      res.setHeader('Cache-Control', `public, max-age=${browserMax}, s-maxage=${sMax}, stale-while-revalidate=300`);
    } else {
      res.setHeader('Cache-Control', 'no-store');
    }
    res.status(200).send(data);
  } catch (err) {
    clearTimeout(timeout);
    console.error('Proxy error:', err);
    res.setHeader('Cache-Control', 'no-store');
    const msg = err.name === 'AbortError' ? 'Request timed out' : 'Backend unavailable';
    res.status(502).json({ success: false, error: msg });
  }
};
