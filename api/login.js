const {
  COOKIE_NAME, SESSION_TTL_MS, createSession, safeEqual
} = require('../lib/session');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const ADMIN_USER = process.env.ADMIN_USER;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const SESSION_SECRET = process.env.SESSION_SECRET;

  if (!ADMIN_USER || !ADMIN_PASSWORD || !SESSION_SECRET) {
    console.error('Login attempted but ADMIN_USER / ADMIN_PASSWORD / SESSION_SECRET is not set');
    return res.status(500).json({ success: false, error: 'Server not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // Both compared every time so a wrong user and a wrong password cost the same.
  const userOk = safeEqual(body.user || '', ADMIN_USER);
  const passOk = safeEqual(body.password || '', ADMIN_PASSWORD);

  if (!userOk || !passOk) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=${createSession(SESSION_SECRET)}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
  ].join('; '));

  res.status(200).json({ success: true });
};
