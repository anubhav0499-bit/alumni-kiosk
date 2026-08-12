// --- Fuzzy matching (client-side for cached data) ---

function normalizeString(str) {
  return String(str).toLowerCase().replace(/\s+/g, ' ').trim();
}

function levenshteinDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function fuzzyMatch(query, target) {
  query = normalizeString(query);
  target = normalizeString(target);
  if (target.includes(query)) return 1.0;
  if (target.startsWith(query)) return 0.95;

  const qWords = query.split(' ');
  const tWords = target.split(' ');
  let matched = 0;
  for (const qw of qWords) {
    for (const tw of tWords) {
      const sim = 1 - levenshteinDistance(qw, tw) / Math.max(qw.length, tw.length);
      if (tw.includes(qw) || sim > 0.7) { matched++; break; }
    }
  }
  const wordScore = matched / qWords.length;
  const editScore = 1 - levenshteinDistance(query, target) / Math.max(query.length, target.length);
  return Math.max(wordScore * 0.8, editScore);
}

// --- Sanitization ---

function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function sanitizeUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol)) return url;
  } catch {}
  return '';
}

function normalizePhotoUrl(url) {
  if (!url) return '';
  url = url.trim();

  let fileId = null;

  // Google Drive: /file/d/FILE_ID/...
  let match = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  if (match) fileId = match[1];

  // Google Drive: open?id=FILE_ID or uc?id=FILE_ID
  if (!fileId) {
    match = url.match(/drive\.google\.com\/(?:open|uc)\?.*id=([^&]+)/);
    if (match) fileId = match[1];
  }

  // Google Drive: /thumbnail?id=FILE_ID
  if (!fileId) {
    match = url.match(/drive\.google\.com\/thumbnail\?.*id=([^&]+)/);
    if (match) fileId = match[1];
  }

  // lh3 URL already
  if (!fileId) {
    match = url.match(/lh3\.googleusercontent\.com\/d\/([^/?]+)/);
    if (match) fileId = match[1];
  }

  if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;

  return url;
}

// --- Debounce ---

function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

// --- Toast notifications ---

function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function createToastContainer() {
  const c = document.createElement('div');
  c.id = 'toast-container';
  document.body.appendChild(c);
  return c;
}

// --- Network status ---

function isOnline() {
  return navigator.onLine;
}

// --- Format timestamp ---

function formatTimestamp(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

// --- CSV export ---

function csvSafeValue(val) {
  let s = String(val || '').replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s}"`;
}

function exportToCsv(data, filename) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => csvSafeValue(row[h])).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
