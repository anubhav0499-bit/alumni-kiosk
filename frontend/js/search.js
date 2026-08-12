// --- Search & API Module ---

const Search = (() => {
  let cachedAlumni = [];
  let cacheTimestamp = 0;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async function fetchFromApi(action, {
    params = {},
    method = 'GET',
    body = null,
    adminKey = ''
  } = {}) {
    if (!isOnline()) throw new Error('No internet connection');
    const url = new URL(CONFIG.api.baseUrl, window.location.origin);
    if (method === 'GET') {
      url.searchParams.set('action', action);
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 28000);
    try {
      const headers = {};
      if (method === 'POST') headers['Content-Type'] = 'application/json';
      if (adminKey) headers['X-Admin-Key'] = adminKey;
      const res = await fetch(url.toString(), {
        method,
        headers,
        body: method === 'POST' ? JSON.stringify({ action, ...body }) : undefined,
        cache: action === 'getAll' || action === 'search' ? 'default' : 'no-store',
        signal: controller.signal
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || `API error: ${res.status}`);
      return result;
    } catch (err) {
      throw err.name === 'AbortError' ? new Error('Request timed out') : err;
    } finally {
      clearTimeout(timeout);
    }
  }


  async function loadAllAlumni() {
    if (cachedAlumni.length && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return cachedAlumni;
    }
    const result = await fetchFromApi('getAll');
    if (!result.success) throw new Error(result.error || 'Could not load alumni data');
    cachedAlumni = result.data || [];
    cacheTimestamp = Date.now();
    return cachedAlumni;
  }

  async function searchAlumni(query) {
    if (!query || !query.trim()) return [];

    // Try local cache first for speed
    if (cachedAlumni.length) {
      const results = cachedAlumni
        .map(a => ({ ...a, _score: fuzzyMatch(query, a.name) }))
        .filter(a => a._score > 0.4)
        .sort((a, b) => b._score - a._score)
        .slice(0, 10);

      if (results.length) return results;
    }

    // Fall back to server
    const result = await fetchFromApi('search', { params: { query } });
    if (!result.success) throw new Error(result.error || 'Search failed');
    return result.data || [];
  }

  async function markAttendance(alumni) {
    return fetchFromApi('markAttendance', {
      method: 'POST',
      body: {
      alumniId: alumni.alumniId,
      deviceId: CONFIG.kiosk.deviceId
      }
    });
  }

  async function checkAttendance(alumniId) {
    return fetchFromApi('checkAttendance', { params: { alumniId } });
  }

  async function getAttendance(adminKey) {
    return fetchFromApi('attendance', { method: 'POST', body: {}, adminKey });
  }

  async function getStats() {
    return fetchFromApi('stats');
  }

  async function resetAttendance(adminKey) {
    return fetchFromApi('resetAttendance', { method: 'POST', body: {}, adminKey });
  }

  async function updateContact({ alumniId, phone, email }) {
    return fetchFromApi('updateContact', {
      method: 'POST',
      body: { alumniId, phone, email }
    });
  }

  function clearCache() {
    cachedAlumni = [];
    cacheTimestamp = 0;
  }

  function getCachedCount() {
    return cachedAlumni.length;
  }

  return {
    loadAllAlumni, searchAlumni, markAttendance, checkAttendance,
    getAttendance, getStats, resetAttendance, updateContact, clearCache, getCachedCount
  };
})();
