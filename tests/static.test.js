const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('HTML pages have unique IDs and valid local asset references', () => {
  for (const page of ['frontend/index.html', 'frontend/admin.html']) {
    const html = read(page);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(ids, [...new Set(ids)], `${page} contains duplicate element IDs`);

    const assets = [...html.matchAll(/(?:src|href)="((?:css|js|assets)\/[^"?]+)(?:\?[^"#]*)?"/g)]
      .map(match => path.join(path.dirname(page), match[1]));
    for (const asset of assets) {
      assert.equal(fs.existsSync(path.join(root, asset)), true, `Missing asset: ${asset}`);
    }
  }
});

test('admin UI starts locked and contains no hard-coded password', () => {
  const html = read('frontend/admin.html');
  const scripts = read('frontend/js/admin.js') + read('frontend/js/config.js');
  assert.match(html, /id="admin-panel" hidden/);
  assert.doesNotMatch(scripts, /ssbf2026admin/i);
});

test('Apps Script GET handler contains no state-changing actions', () => {
  const backend = read('backend/Code.gs');
  const getHandler = backend.slice(
    backend.indexOf('function doGet'),
    backend.indexOf('function doPost')
  );
  assert.doesNotMatch(getHandler, /case 'markAttendance'/);
  assert.doesNotMatch(getHandler, /case 'updateContact'/);
  assert.doesNotMatch(getHandler, /case 'resetAttendance'/);
});
