// --- Admin Panel Controller ---

const Admin = (() => {
  let wired = false;

  // Called only by login.js after /api/login succeeds — never on page load,
  // so no protected data is fetched before authentication.
  function init() {
    if (!wired) {
      wireControls();
      wired = true;
    }
    loadDashboard();
  }

  function wireControls() {
    document.querySelector('.admin-actions').addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      switch (el.dataset.action) {
        case 'refresh': loadDashboard(); break;
        case 'export': exportAttendance(); break;
        case 'test-voice': testGreeting(); break;
        case 'reset': resetAttendanceData(); break;
      }
    });

    document.getElementById('attendance-search')
      .addEventListener('input', searchAttendance);

    document.querySelector('[data-action="update-greeting"]')
      .addEventListener('click', updateGreeting);
  }

  async function loadDashboard() {
    const cachedCount = Search.getCachedCount();
    if (cachedCount) {
      document.getElementById('stat-total').textContent = cachedCount;
      document.getElementById('stat-attended').textContent = '0';
      document.getElementById('stat-rate').textContent = '0%';
    }

    Search.getStats(true).then(stats => {
      if (!stats.success) return;
      document.getElementById('stat-total').textContent = stats.totalAlumni;
      renderBatchChart(stats.batchWise);
    }).catch(() => {});

    loadAttendanceTable();
  }

  async function loadAttendanceTable(filter = '') {
    try {
      const result = await Search.getAttendance(true);
      if (!result.success) return;

      let records = result.data;

      if (!filter) {
        const count = records.length;
        document.getElementById('stat-attended').textContent = count;
        const total = parseInt(document.getElementById('stat-total').textContent) || 0;
        if (total > 0) {
          document.getElementById('stat-rate').textContent = Math.round((count / total) * 100) + '%';
        }
        if (count && !document.getElementById('batch-chart').querySelector('.bar-row')) {
          const batchWise = {};
          records.forEach(r => {
            if (r.batch) batchWise[r.batch] = (batchWise[r.batch] || 0) + 1;
          });
          renderBatchChart(batchWise);
        }
      }

      if (filter) {
        const f = filter.toLowerCase();
        records = records.filter(r =>
          r.name.toLowerCase().includes(f) ||
          r.batch.toLowerCase().includes(f) ||
          r.program.toLowerCase().includes(f)
        );
      }

      records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const tbody = document.getElementById('attendance-tbody');
      tbody.innerHTML = records.map((r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${sanitize(r.name)}</td>
          <td>${sanitize(r.batch)}</td>
          <td>${sanitize(r.program)}</td>
          <td>${formatTimestamp(r.timestamp)}</td>
          <td><span class="status-badge">${sanitize(r.status)}</span></td>
        </tr>
      `).join('');

      document.getElementById('table-count').textContent = `${records.length} records`;
    } catch (err) {
      showToast('Failed to load attendance', 'error');
    }
  }

  function renderBatchChart(data) {
    const container = document.getElementById('batch-chart');
    if (!data || !Object.keys(data).length) {
      container.innerHTML = '<p class="chart-empty">No data yet</p>';
      return;
    }
    const max = Math.max(...Object.values(data));
    container.innerHTML = Object.entries(data).sort().map(([batch, count]) => `
      <div class="bar-row">
        <span class="bar-label">${sanitize(batch)}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:${(count / max) * 100}%">${count}</div>
        </div>
      </div>
    `).join('');
  }


  function exportAttendance() {
    Search.getAttendance().then(result => {
      if (result.success) {
        exportToCsv(result.data, `attendance_${new Date().toISOString().slice(0, 10)}.csv`);
        showToast('Exported successfully', 'success');
      }
    }).catch(() => showToast('Export failed', 'error'));
  }

  function resetAttendanceData() {
    if (!confirm('Are you sure you want to reset ALL attendance records? This cannot be undone.')) return;
    Search.resetAttendance().then(result => {
      if (result.success) {
        showToast('Attendance reset', 'success');
        loadDashboard();
      }
    }).catch(() => showToast('Reset failed', 'error'));
  }

  function testGreeting() {
    Voice.speak('Welcome to the ' + CONFIG.event.title + '. Testing voice greeting.');
  }

  function searchAttendance() {
    const q = document.getElementById('attendance-search').value;
    loadAttendanceTable(q);
  }

  function updateGreeting() {
    const msg = document.getElementById('greeting-template').value;
    if (msg) {
      CONFIG.greeting.template = msg;
      showToast('Greeting updated for this session', 'success');
    }
  }

  return {
    init, loadDashboard, exportAttendance,
    resetAttendanceData, testGreeting, searchAttendance, updateGreeting
  };
})();
