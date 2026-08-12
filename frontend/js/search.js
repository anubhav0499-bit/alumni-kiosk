const Search = (() => {
  let cachedAlumni = [];
  let cacheTimestamp = 0;
  const CACHE_DURATION = 5 * 60 * 1000;
  const LS_KEY = 'alumni_data';
  const LS_TS_KEY = 'alumni_ts';

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const ts = parseInt(localStorage.getItem(LS_TS_KEY) || '0', 10);
      if (raw && ts) {
        cachedAlumni = JSON.parse(raw);
        cacheTimestamp = ts;
      }
    } catch {}
  }

  function saveToStorage() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(cachedAlumni));
      localStorage.setItem(LS_TS_KEY, String(cacheTimestamp));
    } catch {}
  }

  loadFromStorage();

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
    try {
      const result = await fetchFromApi('getAll');
      if (result.success && result.data.length) {
        cachedAlumni = result.data;
        cacheTimestamp = Date.now();
        saveToStorage();
        return cachedAlumni;
      }
    } catch {}
    if (!cachedAlumni.length) {
      try {
        const res = await fetch('/data/seed.json');
        if (res.ok) {
          cachedAlumni = await res.json();
          cacheTimestamp = Date.now();
          saveToStorage();
        }
      } catch {}
    }
    return cachedAlumni;
  }

  function searchAlumni(query) {
    if (!query || !query.trim()) return Promise.resolve([]);
    if (cachedAlumni.length) {
      const results = cachedAlumni
        .map(a => ({ ...a, _score: fuzzyMatch(query, a.name) }))
        .filter(a => a._score > 0.4)
        .sort((a, b) => b._score - a._score)
        .slice(0, 10);
      if (results.length) return Promise.resolve(results);
    }
    return fetchFromApi('search', { query }).then(r => r.success ? r.data : []);
  }

  function markAttendance(alumni) {
    return fetchFromApi('markAttendance', {
      alumniId: alumni.alumniId,
      name: alumni.name,
      batch: alumni.batch,
      program: alumni.program,
      deviceId: CONFIG.kiosk.deviceId
    });
  }

  function checkAttendance(alumniId) {
    return fetchFromApi('checkAttendance', { alumniId });
  }

  function getAttendance(fresh) {
    return fetchFromApi('attendance', fresh ? { _t: Date.now() } : {});
  }

  function getStats(fresh) {
    return fetchFromApi('stats', fresh ? { _t: Date.now() } : {});
  }

  function resetAttendance() {
    return fetchFromApi('resetAttendance');
  }

  async function updateContact({ alumniId, phone, email }) {
    if (!isOnline()) throw new Error('No internet connection');
    const url = new URL(CONFIG.api.baseUrl, window.location.origin);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'updateContact', alumniId, phone, email }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    } catch (err) {
      clearTimeout(timeout);
      throw err.name === 'AbortError' ? new Error('Request timed out') : err;
    }
  }

  function clearCache() {
    cachedAlumni = [];
    cacheTimestamp = 0;
    try { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_TS_KEY); } catch {}
  }

  function getCachedCount() {
    return cachedAlumni.length;
  }

  return {
    loadAllAlumni, searchAlumni, markAttendance, checkAttendance,
    getAttendance, getStats, resetAttendance, updateContact, clearCache, getCachedCount
  };
})();
