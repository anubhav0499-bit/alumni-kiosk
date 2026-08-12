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
    setEventDetails();
    if (Search.getCachedCount()) {
      console.log(`Loaded ${Search.getCachedCount()} alumni from localStorage`);
    }
    preloadData();
    updateLiveCounter();
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

  // --- Loading Screen ---

  function showLoadingScreen() {
    return new Promise(resolve => {
      showScreen('loading-screen');

      const percentEl = document.getElementById('loader-percent');
      const circleEl = document.getElementById('loader-circle');
      const barEl = document.getElementById('loader-bar');
      const tags = document.querySelectorAll('.loader-tag');
      const circumference = 2 * Math.PI * 90;

      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 12 + 6;
        if (progress > 100) progress = 100;

        const pct = Math.round(progress);
        percentEl.textContent = pct + '%';
        circleEl.style.strokeDashoffset = circumference - (circumference * progress / 100);
        barEl.style.width = progress + '%';

        tags.forEach(t => t.classList.remove('loader-tag-active'));
        if (progress < 35) tags[0].classList.add('loader-tag-active');
        else if (progress < 70) tags[1].classList.add('loader-tag-active');
        else tags[2].classList.add('loader-tag-active');

        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(resolve, 200);
        }
      }, 50);
    });
  }

  // --- Alumni Profile ---

  function selectResult(index) {
    if (lastResults[index]) selectAlumni(lastResults[index]);
  }

  async function selectAlumni(alumni) {
    showScreen('profile-screen');
    renderProfile(alumni);

    const counter = document.getElementById('live-counter');
    const presEl = document.getElementById('stat-present');
    const prev = parseInt(presEl?.textContent) || 0;
    const next = prev + 1;
    if (presEl) presEl.textContent = next;
    if (counter) counter.textContent = `${next} checked in`;

    Voice.greet(alumni).catch(() => {});

    Search.markAttendance(alumni).then(result => {
      if (result?.success && result.alreadyCheckedIn) {
        if (presEl) presEl.textContent = prev;
        if (counter) counter.textContent = `${prev} checked in`;
      }
    }).catch(() => {});
  }

  function renderProfile(alumni) {
    const container = document.getElementById('profile-content');
    const photoSrc = normalizePhotoUrl(alumni.photoUrl);
    const photoHtml = photoSrc
      ? `<img src="${sanitizeUrl(photoSrc)}" alt="${sanitize(alumni.name)}" class="profile-photo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';

    container.innerHTML = `
      <div class="profile-card animate-in">
        <div class="profile-header">
          <div class="profile-photo-wrapper">
            ${photoHtml}
            <div class="profile-avatar" ${photoSrc ? 'style="display:none"' : ''}>${getInitials(alumni.name)}</div>
          </div>
          <h1 class="profile-name">${sanitize(alumni.name)}</h1>
          <p class="profile-designation">${sanitize(alumni.designation || '')}${alumni.designation && alumni.company ? ' at ' : ''}${sanitize(alumni.company || '')}</p>
          <div id="attendance-badge" class="attendance-badge badge-success">Checked In ✓</div>
        </div>
        <div class="profile-details">
          ${profileField('Program', alumni.program)}
          ${profileField('Batch', alumni.batch)}
          ${profileField('Graduation', alumni.graduationYear)}
          ${profileField('City', alumni.city)}
          ${alumni.achievement ? profileField('Achievement', alumni.achievement, true) : ''}
        </div>
        ${alumni.linkedin ? `<a href="${sanitizeUrl(alumni.linkedin)}" target="_blank" rel="noopener" class="linkedin-link">View LinkedIn Profile</a>` : ''}

        <div class="contact-update-section" id="contact-update">
          <h3 class="contact-update-title">Update Your Contact Details</h3>
          <p class="contact-update-subtitle">Help us stay connected</p>
          <div class="contact-fields">
            <div class="contact-field">
              <label for="contact-phone">Phone Number</label>
              <input type="tel" id="contact-phone" placeholder="+91 98765 43210" autocomplete="off" value="${sanitize(alumni.phone || '')}">
            </div>
            <div class="contact-field">
              <label for="contact-email">Email Address</label>
              <input type="email" id="contact-email" placeholder="yourname@email.com" autocomplete="off" value="${sanitize(alumni.email || '')}">
            </div>
          </div>
          <div class="contact-actions">
            <button class="btn btn-primary contact-submit-btn" id="contact-submit-btn" onclick="App.submitContactUpdate('${sanitize(alumni.alumniId).replace(/'/g, "\\'")}')">Save & Continue</button>
            <button class="btn btn-secondary" onclick="App.goHome()">Skip</button>
          </div>
          <div id="contact-status" class="contact-status"></div>
        </div>
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

  // --- Contact Update ---

  async function submitContactUpdate(alumniId) {
    const phone = document.getElementById('contact-phone').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const btn = document.getElementById('contact-submit-btn');
    const status = document.getElementById('contact-status');

    if (!phone && !email) {
      status.textContent = 'Please enter at least one field.';
      status.className = 'contact-status contact-status-error';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving...';
    status.textContent = '';

    try {
      const result = await Search.updateContact({ alumniId, phone, email });
      if (result.success) {
        Search.clearCache();
        status.textContent = 'Details saved successfully!';
        status.className = 'contact-status contact-status-success';
        setTimeout(goHome, 2000);
      } else {
        throw new Error(result.error || 'Failed to save');
      }
    } catch (err) {
      status.textContent = 'Could not save. Please inform the desk.';
      status.className = 'contact-status contact-status-error';
      btn.disabled = false;
      btn.textContent = 'Save & Continue';
    }
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

  function preloadData() {
    Search.loadAllAlumni()
      .then(() => {
        const count = Search.getCachedCount();
        console.log(`Refreshed ${count} alumni from API`);
        const regEl = document.getElementById('stat-registered');
        if (regEl && count) regEl.textContent = count;
      })
      .catch(() => console.warn('API refresh failed, using cached data'));
  }

  // --- Live Counter ---

  function updateLiveCounter() {
    const counter = document.getElementById('live-counter');
    const regEl = document.getElementById('stat-registered');
    const presEl = document.getElementById('stat-present');
    const count = Search.getCachedCount();
    if (regEl && count) regEl.textContent = count;
    if (presEl) presEl.textContent = '0';

    Search.getStats().then(stats => {
      if (!stats.success) throw new Error('stats failed');
      if (counter) counter.textContent = `${stats.totalAttendance} checked in`;
      if (regEl) regEl.textContent = stats.totalAlumni;
      if (presEl) presEl.textContent = stats.totalAttendance;
    }).catch(() => {
      Search.getAttendance().then(result => {
        if (!result.success) return;
        const n = result.data.length;
        if (counter) counter.textContent = `${n} checked in`;
        if (presEl) presEl.textContent = n;
      }).catch(() => {});
    });
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
    submitContactUpdate, startVoiceSearch, toggleFullscreen,
    getSearchHistory: () => searchHistory
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
