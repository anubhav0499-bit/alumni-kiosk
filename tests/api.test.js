const test = require('node:test');
const assert = require('node:assert/strict');

const handler = require('../api/index.js');

function responseDouble() {
  return {
    headers: {},
    statusCode: 200,
    payload: null,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };
}

function upstream(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload)
  };
}

test('public alumni responses redact email and phone fields', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => upstream({
    success: true,
    data: [{
      alumniId: 'A1',
      name: 'Test Alumni',
      email: 'private@example.com',
      phone: '+91 9999999999',
      company: 'Example'
    }]
  });

  const res = responseDouble();
  await handler({ method: 'GET', query: { action: 'getAll' }, headers: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.data[0].name, 'Test Alumni');
  assert.equal(res.payload.data[0].company, 'Example');
  assert.equal('email' in res.payload.data[0], false);
  assert.equal('phone' in res.payload.data[0], false);
});

test('state-changing actions reject GET requests', async () => {
  const res = responseDouble();
  await handler({ method: 'GET', query: { action: 'resetAttendance' }, headers: {} }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, 'POST');
});

test('admin actions fail closed without a valid access code', async (t) => {
  const previousPassword = process.env.ADMIN_PASSWORD;
  const previousToken = process.env.BACKEND_ADMIN_TOKEN;
  t.after(() => {
    if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = previousPassword;
    if (previousToken === undefined) delete process.env.BACKEND_ADMIN_TOKEN;
    else process.env.BACKEND_ADMIN_TOKEN = previousToken;
  });
  process.env.ADMIN_PASSWORD = 'correct-horse';
  process.env.BACKEND_ADMIN_TOKEN = 'backend-token';

  const res = responseDouble();
  await handler({
    method: 'POST',
    query: {},
    headers: { 'x-admin-key': 'wrong' },
    body: { action: 'resetAttendance' }
  }, res);

  assert.equal(res.statusCode, 401);
});

test('admin proxy forwards only the machine token to Apps Script', async (t) => {
  const originalFetch = global.fetch;
  const previousPassword = process.env.ADMIN_PASSWORD;
  const previousToken = process.env.BACKEND_ADMIN_TOKEN;
  t.after(() => {
    global.fetch = originalFetch;
    if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = previousPassword;
    if (previousToken === undefined) delete process.env.BACKEND_ADMIN_TOKEN;
    else process.env.BACKEND_ADMIN_TOKEN = previousToken;
  });
  process.env.ADMIN_PASSWORD = 'dashboard-secret';
  process.env.BACKEND_ADMIN_TOKEN = 'machine-secret';

  let requestedUrl;
  let requestedOptions;
  global.fetch = async (url, options) => {
    requestedUrl = new URL(url);
    requestedOptions = options;
    return upstream({ success: true, data: [] });
  };

  const res = responseDouble();
  await handler({
    method: 'POST',
    query: {},
    headers: { 'x-admin-key': 'dashboard-secret' },
    body: { action: 'attendance' }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(requestedUrl.searchParams.has('adminToken'), false);
  assert.equal(JSON.parse(requestedOptions.body).adminToken, 'machine-secret');
  assert.equal(requestedUrl.toString().includes('dashboard-secret'), false);
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('attendance writes use POST and are never cached', async (t) => {
  const originalFetch = global.fetch;
  const previousToken = process.env.BACKEND_KIOSK_TOKEN;
  t.after(() => {
    global.fetch = originalFetch;
    if (previousToken === undefined) delete process.env.BACKEND_KIOSK_TOKEN;
    else process.env.BACKEND_KIOSK_TOKEN = previousToken;
  });
  process.env.BACKEND_KIOSK_TOKEN = 'kiosk-machine-secret';
  let upstreamOptions;
  global.fetch = async (_url, options) => {
    upstreamOptions = options;
    return upstream({ success: true });
  };

  const res = responseDouble();
  await handler({
    method: 'POST',
    query: {},
    headers: {},
    body: { action: 'markAttendance', alumniId: 'A1', deviceId: 'KIOSK-01' }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(upstreamOptions.method, 'POST');
  assert.equal(JSON.parse(upstreamOptions.body).alumniId, 'A1');
  assert.equal(JSON.parse(upstreamOptions.body).kioskToken, 'kiosk-machine-secret');
  assert.equal(res.headers['cache-control'], 'no-store');
});
