// --- Main Application Controller ---

const App = (() => {
  let inactivityTimer = null;
  let currentScreen = 'home';
  let searchHistory = [];
  let lastResults = [];

  function init() {
    setupEventListeners();
    setupInactivityTimer();
    setupNetworkListeners();
    preloadData();
    updateLiveCounter();
    setEventDetails();
  }

  function setEventDetails() {
    const el = (id) => document.getElementById(id);
    el('event-title').textContent = CONFIG.event.title;
    el('event-subtitle').textContent = CONFIG.event.subtitle;
    el('event-info').textContent = `${CONFIG.event.date} | ${CONFIG.event.venue}`;
  }

  // --- Navigation ---

  function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) {
      screen.classList.add('active');
      currentScreen = screenId;
    }
    resetInactivityTimer();
  }

  function goHome() {
    Voice.stopSpeaking();
    showScreen('home-screen');
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').innerHTML = '';
    document.getElementById('search-results').classList.remove('visible');
    document.getElementById('search-input').focus();
  }

  // --- Search ---

  async function handleSearch(query) {
    if (!query || !query.trim()) return;
    query = query.trim();

    resetInactivityTimer();
    showSearchLoading(true);

    try {
      const results = await Search.searchAlumni(query);

      if (results.length === 0) {
        showNoResults();
      } else {
        showResultsList(results);
      }

      searchHistory.unshift({ query, time: new Date(), resultCount: results.length });
      if (searchHistory.length > 50) searchHistory.pop();
    } catch (err) {
      showToast(err.message || 'Search failed. Please try again.', 'error');
    } finally {
      showSearchLoading(false);
    }
  }

  function showSearchLoading(show) {
    const btn = document.getElementById('search-btn');
    const spinner = document.getElementById('search-spinner');
    if (show) {
      btn.disabled = true;
      spinner.classList.add('visible');
    } else {
      btn.disabled = false;
      spinner.classList.remove('visible');
    }
  }

  function showResultsList(results) {
    lastResults = results;
    const container = document.getElementById('search-results');
    container.innerHTML = `
      <div class="results-header">
        <h3>${results.length} match${results.length > 1 ? 'es' : ''} found</h3>
        <p>Please select your name</p>
      </div>
      <div class="results-list">
        ${results.map((a, i) => `
          <button class="result-item" onclick="App.selectResult(${i})">
            <div class="result-avatar">${getInitials(a.name)}</div>
            <div class="result-info">
              <span class="result-name">${sanitize(a.name)}</span>
              <span class="result-detail">${sanitize(a.program)} | Batch ${sanitize(a.batch)}</span>
            </div>
            <span class="result-arrow">&#8250;</span>
          </button>
        `).join('')}
      </div>
    `;
    container.classList.add('visible');
  }

  function showNoResults() {
    const container = document.getElementById('search-results');
    container.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">&#128533;</div>
        <h3>No Match Found</h3>
        <p>Sorry, we couldn't find your details.<br>Please contact the registration desk.</p>
        <button class="btn btn-primary" onclick="App.goHome()">Try Again</button>
      </div>
    `;
    container.classList.add('visible');
  }

  // --- Alumni Profile ---

  function selectResult(index) {
    if (lastResults[index]) selectAlumni(lastResults[index]);
  }

  async function selectAlumni(alumni) {
    showScreen('profile-screen');
    renderProfile(alumni);

    try {
      const attendance = await Search.markAttendance(alumni);
      if (attendance.alreadyCheckedIn) {
        showToast('You have already checked in.', 'warning', 5000);
        document.getElementById('attendance-badge').textContent = 'Already Checked In';
        document.getElementById('attendance-badge').className = 'attendance-badge badge-duplicate';
      } else if (attendance.success) {
        document.getElementById('attendance-badge').textContent = 'Checked In ✓';
        document.getElementById('attendance-badge').className = 'attendance-badge badge-success';
        updateLiveCounter();
      }
    } catch (err) {
      console.error('Attendance error:', err);
      document.getElementById('attendance-badge').textContent = 'Check-in Error';
      document.getElementById('attendance-badge').className = 'attendance-badge badge-duplicate';
      showToast('Could not record attendance. Please inform the desk.', 'error');
    }

    try {
      await Voice.greet(alumni);
    } catch {}
  }

  function renderProfile(alumni) {
    const container = document.getElementById('profile-content');
    const photoHtml = alumni.photoUrl
      ? `<img src="${sanitizeUrl(alumni.photoUrl)}" alt="${sanitize(alumni.name)}" class="profile-photo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';

    container.innerHTML = `
      <div class="profile-card animate-in">
        <div class="profile-header">
          <div class="profile-photo-wrapper">
            ${photoHtml}
            <div class="profile-avatar" ${alumni.photoUrl ? 'style="display:none"' : ''}>${getInitials(alumni.name)}</div>
          </div>
          <h1 class="profile-name">${sanitize(alumni.name)}</h1>
          <p class="profile-designation">${sanitize(alumni.designation || '')}${alumni.designation && alumni.company ? ' at ' : ''}${sanitize(alumni.company || '')}</p>
          <div id="attendance-badge" class="attendance-badge badge-pending">Recording...</div>
        </div>
        <div class="profile-details">
          ${profileField('Program', alumni.program)}
          ${profileField('Batch', alumni.batch)}
          ${profileField('Graduation', alumni.graduationYear)}
          ${profileField('City', alumni.city)}
          ${alumni.achievement ? profileField('Achievement', alumni.achievement, true) : ''}
        </div>
        ${alumni.linkedin ? `<a href="${sanitizeUrl(alumni.linkedin)}" target="_blank" rel="noopener" class="linkedin-link">View LinkedIn Profile</a>` : ''}
        <button class="btn btn-large btn-primary" onclick="App.goHome()">Done</button>
      </div>
    `;
  }

  function profileField(label, value, highlight = false) {
    if (!value) return '';
    return `
      <div class="profile-field ${highlight ? 'field-highlight' : ''}">
        <span class="field-label">${sanitize(label)}</span>
        <span class="field-value">${sanitize(value)}</span>
      </div>
    `;
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').filter(w => w).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  // --- Voice Search ---

  function startVoiceSearch() {
    const btn = document.getElementById('voice-btn');
    const indicator = document.getElementById('voice-indicator');

    if (Voice.isListening()) {
      Voice.stopListening();
      btn.classList.remove('listening');
      indicator.classList.remove('visible');
      return;
    }

    btn.classList.add('listening');
    indicator.classList.add('visible');
    indicator.textContent = 'Listening...';

    Voice.startListening(
      (transcript, confidence) => {
        btn.classList.remove('listening');
        indicator.classList.remove('visible');
        document.getElementById('search-input').value = transcript;

        if (confidence < 0.7) {
          showConfirmation(transcript);
        } else {
          handleSearch(transcript);
        }
      },
      (error) => {
        btn.classList.remove('listening');
        indicator.classList.remove('visible');
        if (error) showToast(error, 'error');
      },
      (interim) => {
        indicator.textContent = interim || 'Listening...';
        document.getElementById('search-input').value = interim;
      }
    );
  }

  function showConfirmation(transcript) {
    const container = document.getElementById('search-results');
    container.innerHTML = `
      <div class="voice-confirm">
        <p>Did you mean:</p>
        <h3>"${sanitize(transcript)}"</h3>
        <div class="confirm-actions">
          <button class="btn btn-primary" onclick="App.handleSearch('${sanitize(transcript).replace(/'/g, "\\'")}')">Yes, Search</button>
          <button class="btn btn-secondary" onclick="App.startVoiceSearch()">Try Again</button>
        </div>
      </div>
    `;
    container.classList.add('visible');
  }

  // --- Inactivity Timer ---

  function setupInactivityTimer() {
    const events = ['click', 'touchstart', 'keydown', 'mousemove'];
    events.forEach(e => document.addEventListener(e, resetInactivityTimer, { passive: true }));
  }

  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    if (currentScreen !== 'home-screen') {
      inactivityTimer = setTimeout(() => {
        goHome();
        showToast('Session timed out. Welcome!', 'info');
      }, CONFIG.kiosk.inactivityTimeout * 1000);
    }
  }

  // --- Network ---

  function setupNetworkListeners() {
    window.addEventListener('online', () => showToast('Connection restored', 'success'));
    window.addEventListener('offline', () => showToast('No internet connection', 'error', 8000));
  }

  // --- Preload ---

  async function preloadData() {
    try {
      await Search.loadAllAlumni();
      console.log(`Cached ${Search.getCachedCount()} alumni records`);
    } catch {
      console.warn('Could not preload alumni data');
    }
  }

  // --- Live Counter ---

  async function updateLiveCounter() {
    try {
      const stats = await Search.getStats();
      const counter = document.getElementById('live-counter');
      if (counter && stats.success) {
        counter.textContent = `${stats.totalAttendance} checked in`;
      }
      const regEl = document.getElementById('stat-registered');
      const presEl = document.getElementById('stat-present');
      if (regEl && stats.success) regEl.textContent = stats.totalAlumni;
      if (presEl && stats.success) presEl.textContent = stats.totalAttendance;
    } catch {}
  }

  // --- Event Listeners ---

  function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const homeBtn = document.getElementById('home-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSearch(searchInput.value);
    });

    const debouncedSearch = debounce((q) => {
      if (q.length >= 2) handleSearch(q);
    }, 400);
    searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));

    searchBtn.addEventListener('click', () => handleSearch(searchInput.value));
    voiceBtn.addEventListener('click', startVoiceSearch);
    homeBtn?.addEventListener('click', goHome);
    fullscreenBtn?.addEventListener('click', toggleFullscreen);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') goHome();
      if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
    });
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  return {
    init, goHome, handleSearch, selectAlumni, selectResult,
    startVoiceSearch, toggleFullscreen,
    getSearchHistory: () => searchHistory
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
