// Signed admin session cookie. Stateless: the cookie carries its own expiry
// and an HMAC over it, so there is nothing to store server-side.

const crypto = require('crypto');

const COOKIE_NAME = 'admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function createSession(secret) {
  const payload = Buffer
    .from(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS }))
    .toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

function verifySession(token, secret) {
  if (!token || !secret) return false;

  const parts = String(token).split('.');
  if (parts.length !== 2) return false;

  const [payload, mac] = parts;
  const given = Buffer.from(mac);
  const expected = Buffer.from(sign(payload, secret));
  if (given.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(given, expected)) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof exp === 'number' && Date.now() < exp;
  } catch {
    return false;
  }
}

// Compares digests rather than raw values so the timing-safe compare never
// sees mismatched lengths (which would leak the expected length).
function safeEqual(a, b) {
  const ah = crypto.createHash('sha256').update(String(a)).digest();
  const bh = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ah, bh);
}

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

module.exports = {
  COOKIE_NAME, SESSION_TTL_MS,
  createSession, verifySession, safeEqual, parseCookies
};
