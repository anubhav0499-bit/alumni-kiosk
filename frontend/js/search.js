// --- Search & API Module ---

const Search = (() => {
  let cachedAlumni = [];
  let cacheTimestamp = 0;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async function fetchFromApi(action, params = {}) {
    if (!isOnline()) throw new Error('No internet connection');
    const url = new URL(CONFIG.api.baseUrl, window.location.origin);
    url.searchParams.set('action', action);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    } catch (err) {
      clearTimeout(timeout);
      throw err.name === 'AbortError' ? new Error('Request timed out') : err;
    }
  }


  async function loadAllAlumni() {
    if (cachedAlumni.length && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return cachedAlumni;
    }
    const result = await fetchFromApi('getAll');
    if (result.success) {
      cachedAlumni = result.data;
      cacheTimestamp = Date.now();
    }
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
    const result = await fetchFromApi('search', { query });
    return result.success ? result.data : [];
  }

  async function markAttendance(alumni) {
    return fetchFromApi('markAttendance', {
      alumniId: alumni.alumniId,
      name: alumni.name,
      batch: alumni.batch,
      program: alumni.program,
      deviceId: CONFIG.kiosk.deviceId
    });
  }

  async function checkAttendance(alumniId) {
    return fetchFromApi('checkAttendance', { alumniId });
  }

  async function getAttendance() {
    return fetchFromApi('attendance');
  }

  async function getStats() {
    return fetchFromApi('stats');
  }

  async function resetAttendance() {
    return fetchFromApi('resetAttendance');
  }

  async function updateContact({ alumniId, phone, email }) {
    if (!isOnline()) throw new Error('No internet connection');
    const res = await fetch(CONFIG.api.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'updateContact', alumniId, phone, email })
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
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
