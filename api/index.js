const crypto = require('crypto');

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbw8Z1pUDnuef1Rqgk0XgmLR4QrXzYF89Vx4hprJ5mWLnd0v3rytfIS6YSqQtGEez9C5/exec';

const ACTIONS = {
  getAll: { method: 'GET', access: 'public', cache: 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' },
  search: { method: 'GET', access: 'public', cache: 'public, max-age=30, s-maxage=60, stale-while-revalidate=300' },
  stats: { method: 'GET', access: 'public', cache: 'no-store' },
  checkAttendance: { method: 'GET', access: 'public', cache: 'no-store' },
  markAttendance: { method: 'POST', access: 'kiosk', cache: 'no-store' },
  updateContact: { method: 'POST', access: 'kiosk', cache: 'no-store' },
  attendance: { method: 'POST', access: 'admin', cache: 'no-store' },
  resetAttendance: { method: 'POST', access: 'admin', cache: 'no-store' }
};

const PUBLIC_ALUMNI_FIELDS = [
  'alumniId', 'name', 'photoUrl', 'program', 'batch', 'graduationYear',
  'company', 'designation', 'city', 'linkedin', 'achievement', '_score'
];
const FETCH_TIMEOUT = 25000;

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'object') return body;
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

function secureEqual(actual, expected) {
  if (!actual || !expected) return false;
  const actualBuffer = Buffer.from(String(actual));
  const expectedBuffer = Buffer.from(String(expected));
  return actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function getAdminKey(req) {
  const header = req.headers?.['x-admin-key'];
  return Array.isArray(header) ? header[0] : header;
}

function publicAlumni(record) {
  return PUBLIC_ALUMNI_FIELDS.reduce((safe, field) => {
    if (record && Object.prototype.hasOwnProperty.call(record, field)) safe[field] = record[field];
    return safe;
  }, {});
}

function sanitizeResponse(action, payload) {
  if ((action === 'getAll' || action === 'search') && Array.isArray(payload?.data)) {
    return { ...payload, data: payload.data.map(publicAlumni) };
  }
  if (action === 'checkAttendance' && payload) {
    return { alreadyCheckedIn: Boolean(payload.alreadyCheckedIn) };
  }
  return payload;
}

function setCommonHeaders(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
}

module.exports = async function handler(req, res) {
  setCommonHeaders(res);

  const method = String(req.method || 'GET').toUpperCase();
  const requestBody = parseBody(req.body);
  const action = String(method === 'POST' ? requestBody.action || '' : req.query?.action || '');
  const rule = ACTIONS[action];

  if (!rule) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ success: false, error: 'Unknown action' });
  }

  if (method !== rule.method) {
    res.setHeader('Allow', rule.method);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({ success: false, error: `${action} requires ${rule.method}` });
  }

  if (rule.access === 'admin') {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(503).json({ success: false, error: 'Admin access is not configured' });
    }
    if (!secureEqual(getAdminKey(req), adminPassword)) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(401).json({ success: false, error: 'Invalid admin access code' });
    }
  }

  const url = new URL(APPS_SCRIPT_URL);
  const upstreamBody = method === 'POST' ? { ...requestBody, action } : null;

  if (method === 'GET') {
    for (const [key, value] of Object.entries(req.query || {})) {
      if (key !== 'action' && typeof value === 'string') url.searchParams.set(key, value.slice(0, 300));
    }
    url.searchParams.set('action', action);
  }

  if (rule.access === 'admin' || rule.access === 'kiosk') {
    const backendToken = rule.access === 'admin'
      ? process.env.BACKEND_ADMIN_TOKEN
      : process.env.BACKEND_KIOSK_TOKEN;
    if (!backendToken) {
      res.setHeader('Cache-Control', 'no-store');
      const scope = rule.access === 'admin' ? 'admin' : 'kiosk';
      return res.status(503).json({ success: false, error: `Backend ${scope} access is not configured` });
    }
    const tokenField = rule.access === 'admin' ? 'adminToken' : 'kioskToken';
    if (method === 'GET') url.searchParams.set(tokenField, backendToken);
    else upstreamBody[tokenField] = backendToken;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url.toString(), {
      method,
      redirect: 'follow',
      headers: method === 'POST' ? { 'Content-Type': 'text/plain;charset=utf-8' } : undefined,
      body: method === 'POST' ? JSON.stringify(upstreamBody) : undefined,
      signal: controller.signal
    });
    const text = await response.text();

    if (!response.ok || /^\s*</.test(text)) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(502).json({ success: false, error: 'Backend unavailable' });
    }

    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(502).json({ success: false, error: 'Invalid backend response' });
    }

    res.setHeader('Cache-Control', rule.cache);
    return res.status(200).json(sanitizeResponse(action, payload));
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    const error = err.name === 'AbortError' ? 'Backend request timed out' : 'Backend unavailable';
    return res.status(502).json({ success: false, error });
  } finally {
    clearTimeout(timeout);
  }
};

module.exports._test = { parseBody, secureEqual, publicAlumni, sanitizeResponse, ACTIONS };
