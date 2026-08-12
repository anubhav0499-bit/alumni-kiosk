const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw8Z1pUDnuef1Rqgk0XgmLR4QrXzYF89Vx4hprJ5mWLnd0v3rytfIS6YSqQtGEez9C5/exec';

export default async function handler(req, res) {
  const url = new URL(APPS_SCRIPT_URL);
  for (const [k, v] of Object.entries(req.query)) {
    url.searchParams.set(k, v);
  }

  const options = { method: req.method, redirect: 'follow' };
  if (req.method === 'POST') {
    options.headers = { 'Content-Type': 'text/plain' };
    options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  const response = await fetch(url.toString(), options);
  const data = await response.text();

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.status(response.ok ? 200 : 502).send(data);
}
