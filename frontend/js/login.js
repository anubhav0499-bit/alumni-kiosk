// Admin login. Credentials are verified server-side by /api/login, which
// issues an HttpOnly session cookie; nothing secret exists in this file.
// The dashboard is only initialised after that call succeeds, so no
// protected data is fetched before authentication.

(function () {
  const overlay = document.getElementById('login-overlay');
  const container = document.getElementById('admin-container');
  const userEl = document.getElementById('login-user');
  const passEl = document.getElementById('login-pass');
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  function showError(message) {
    errEl.textContent = message;
    errEl.style.animation = 'none';
    void errEl.offsetHeight;
    errEl.style.animation = 'loginShake 0.4s ease';
    passEl.value = '';
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }

  function revealDashboard() {
    overlay.classList.add('login-exit');
    container.style.display = '';
    overlay.addEventListener('transitionend', function handler() {
      overlay.style.display = 'none';
      overlay.removeEventListener('transitionend', handler);
    });
    Admin.init();
  }

  async function attemptLogin() {
    if (btn.disabled) return;

    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: userEl.value.trim(), password: passEl.value })
      });
      const result = await res.json().catch(() => ({}));

      if (res.ok && result.success) {
        revealDashboard();
      } else if (res.status === 500) {
        showError('Server not configured. Check environment variables.');
      } else {
        showError('Invalid credentials. Please try again.');
      }
    } catch {
      showError('Cannot reach server. Check your connection.');
    }
  }

  btn.addEventListener('click', attemptLogin);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !overlay.classList.contains('login-exit')) attemptLogin();
  });
})();
