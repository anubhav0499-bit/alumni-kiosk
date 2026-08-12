// --- Admin Panel Controller ---

const Admin = (() => {
  let adminCredentials = null;
  let attendanceRecords = [];

  function init() {
    const savedGreeting = localStorage.getItem('greetingTemplate');
    if (savedGreeting && savedGreeting.length <= 500) {
      CONFIG.greeting.template = savedGreeting;
    }
    document.getElementById('greeting-template').value = CONFIG.greeting.template;
    document.getElementById('admin-login-form').addEventListener('submit', login);
    document.getElementById('admin-username').focus();
  }

  async function login(event) {
    event.preventDefault();
    const usernameInput = document.getElementById('admin-username');
    const passwordInput = document.getElementById('admin-password');
    const button = document.getElementById('admin-login-btn');
    const status = document.getElementById('admin-login-status');
    const candidate = {
      username: usernameInput.value.trim(),
      password: passwordInput.value
    };

    if (!candidate.username || !candidate.password) return;
    button.disabled = true;
    button.textContent = 'Checking...';
    status.textContent = '';

    try {
      const result = await Search.getAttendance(candidate);
      if (!result.success) throw new Error(result.error || 'Unable to unlock dashboard');
      adminCredentials = candidate;
      attendanceRecords = result.data || [];
      passwordInput.value = '';
      document.getElementById('admin-login').hidden = true;
      document.getElementById('admin-panel').hidden = false;
      await loadDashboard({ useLoadedAttendance: true });
    } catch (err) {
      status.textContent = err.message || 'Invalid username or password';
      status.className = 'contact-status contact-status-error';
      passwordInput.select();
    } finally {
      button.disabled = false;
      button.textContent = 'Unlock Dashboard';
    }
  }

  function logout() {
    adminCredentials = null;
    attendanceRecords = [];
    document.getElementById('admin-panel').hidden = true;
    document.getElementById('admin-login').hidden = false;
    document.getElementById('admin-username').focus();
  }

  function handleAuthError(err) {
    if (/username|password|admin access|configured/i.test(err.message || '')) {
      logout();
    }
  }

  async function loadDashboard({ useLoadedAttendance = false } = {}) {
    try {
      const stats = await Search.getStats();
      if (stats.success) {
        document.getElementById('stat-total').textContent = stats.totalAlumni;
        document.getElementById('stat-attended').textContent = stats.totalAttendance;
        document.getElementById('stat-rate').textContent = stats.attendanceRate + '%';
        renderBatchChart(stats.batchWise);
        renderProgramChart(stats.programWise);
      }
    } catch {
      showToast('Failed to load statistics', 'error');
    }

    if (useLoadedAttendance) renderAttendanceTable();
    else await loadAttendanceTable();
  }

  async function loadAttendanceTable() {
    try {
      const result = await Search.getAttendance(adminCredentials);
      if (!result.success) throw new Error(result.error || 'Failed to load attendance');
      attendanceRecords = result.data || [];
      renderAttendanceTable();
    } catch (err) {
      handleAuthError(err);
      showToast(err.message || 'Failed to load attendance', 'error');
    }
  }

  function renderAttendanceTable(filter = '') {
    let records = attendanceRecords.slice();
    if (filter) {
      const normalizedFilter = filter.toLowerCase();
      records = records.filter(record =>
        String(record.name || '').toLowerCase().includes(normalizedFilter) ||
        String(record.batch || '').toLowerCase().includes(normalizedFilter) ||
        String(record.program || '').toLowerCase().includes(normalizedFilter)
      );
    }

    records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const tbody = document.getElementById('attendance-tbody');
    tbody.innerHTML = records.map((record, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${sanitize(record.name)}</td>
        <td>${sanitize(record.batch)}</td>
        <td>${sanitize(record.program)}</td>
        <td>${sanitize(formatTimestamp(record.timestamp))}</td>
        <td><span class="status-badge">${sanitize(record.status)}</span></td>
      </tr>
    `).join('');
    document.getElementById('table-count').textContent = `${records.length} records`;
  }

  function renderBatchChart(data) {
    renderBarChart('batch-chart', data, false, true);
  }

  function renderProgramChart(data) {
    renderBarChart('program-chart', data, true, false);
  }

  function renderBarChart(containerId, data, secondary, sortKeys) {
    const container = document.getElementById(containerId);
    if (!data || !Object.keys(data).length) {
      container.innerHTML = '<p class="chart-empty">No data yet</p>';
      return;
    }
    const max = Math.max(...Object.values(data));
    const entries = Object.entries(data);
    if (sortKeys) entries.sort(([a], [b]) => a.localeCompare(b));
    container.innerHTML = entries.map(([label, count]) => `
      <div class="bar-row">
        <span class="bar-label">${sanitize(label || 'Unknown')}</span>
        <div class="bar-track">
          <div class="bar-fill${secondary ? ' bar-fill-secondary' : ''}" style="width:${(count / max) * 100}%">${count}</div>
        </div>
      </div>
    `).join('');
  }

  function exportAttendance() {
    if (!attendanceRecords.length) {
      showToast('No attendance records to export', 'warning');
      return;
    }
    exportToCsv(attendanceRecords, `attendance_${new Date().toISOString().slice(0, 10)}.csv`);
    showToast('Exported successfully', 'success');
  }

  async function resetAttendanceData() {
    if (!confirm('Are you sure you want to reset ALL attendance records? This cannot be undone.')) return;
    try {
      const result = await Search.resetAttendance(adminCredentials);
      if (!result.success) throw new Error(result.error || 'Reset failed');
      attendanceRecords = [];
      showToast('Attendance reset', 'success');
      await loadDashboard();
    } catch (err) {
      handleAuthError(err);
      showToast(err.message || 'Reset failed', 'error');
    }
  }

  function testGreeting() {
    Voice.speak('Welcome to the ' + CONFIG.event.title + '. Testing voice greeting.');
  }

  function searchAttendance() {
    renderAttendanceTable(document.getElementById('attendance-search').value);
  }

  function updateGreeting() {
    const msg = document.getElementById('greeting-template').value.trim();
    if (msg && msg.length <= 500) {
      CONFIG.greeting.template = msg;
      localStorage.setItem('greetingTemplate', msg);
      showToast('Greeting saved for this kiosk', 'success');
    } else if (msg.length > 500) {
      showToast('Greeting must be 500 characters or fewer', 'error');
    }
  }

  return {
    init, login, logout, loadDashboard, exportAttendance,
    resetAttendanceData, testGreeting, searchAttendance, updateGreeting
  };
})();

document.addEventListener('DOMContentLoaded', Admin.init);
