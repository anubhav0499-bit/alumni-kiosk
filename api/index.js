const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw8Z1pUDnuef1Rqgk0XgmLR4QrXzYF89Vx4hprJ5mWLnd0v3rytfIS6YSqQtGEez9C5/exec';

const READ_ACTIONS = new Set(['getAll', 'stats', 'search', 'checkAttendance', 'attendance']);
const FETCH_TIMEOUT = 15000;

module.exports = async function handler(req, res) {
  const url = new URL(APPS_SCRIPT_URL);
  for (const [k, v] of Object.entries(req.query)) {
    url.searchParams.set(k, v);
  }

  const action = req.query.action || '';
  const options = { method: req.method, redirect: 'follow' };
  if (req.method === 'POST') {
    options.headers = { 'Content-Type': 'text/plain' };
    options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
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
    if (READ_ACTIONS.has(action)) {
      const sMax = action === 'getAll' ? 120 : 30;
      const browserMax = action === 'getAll' ? 60 : 15;
      res.setHeader('Cache-Control', `public, max-age=${browserMax}, s-maxage=${sMax}, stale-while-revalidate=300`);
    } else {
      res.setHeader('Cache-Control', 'no-store');
    }
    res.status(200).send(data);
  } catch (err) {
    clearTimeout(timeout);
    const msg = err.name === 'AbortError' ? 'Request timed out' : err.message;
    res.status(502).json({ success: false, error: msg });
  }
};
