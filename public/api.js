/* ============================================================
   Medisiana — Shared API client & auth guard
   ============================================================ */

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('medisiana_token');
}

function getUser() {
  const raw = localStorage.getItem('medisiana_user');
  return raw ? JSON.parse(raw) : null;
}

function setSession(token, user) {
  localStorage.setItem('medisiana_token', token);
  localStorage.setItem('medisiana_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('medisiana_token');
  localStorage.removeItem('medisiana_user');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.error || `Request gagal (${res.status})`);
  return data;
}

// Redirect ke index.html jika belum login. Panggil di halaman terproteksi.
function requireAuth(requiredRole) {
  const token = getToken();
  const user = getUser();
  if (!token || !user) {
    window.location.href = 'index.html';
    return null;
  }
  if (requiredRole && user.role !== requiredRole) {
    window.location.href = user.role === 'admin' ? 'admin-books.html' : 'dashboard.html';
    return null;
  }
  return user;
}

function logout() {
  clearSession();
  window.location.href = 'index.html';
}

/* ── Toast notifications ──
   Replaces native alert() with a small, dismissible, auto-expiring card
   stacked in the corner of the screen. Call toast('Pesan', 'success'|'error'|'info'). */
function ensureToastStack() {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  return stack;
}

const TOAST_ICONS = {
  success: 'ti-circle-check',
  error: 'ti-alert-circle',
  info: 'ti-info-circle',
};

function toast(message, type = 'info', duration = 4200) {
  const stack = ensureToastStack();

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <i class="ti ${TOAST_ICONS[type] || TOAST_ICONS.info}" aria-hidden="true"></i>
    <div class="toast-msg"></div>
    <button class="toast-close" aria-label="Tutup"><i class="ti ti-x" aria-hidden="true"></i></button>
  `;
  el.querySelector('.toast-msg').textContent = message;
  stack.appendChild(el);

  requestAnimationFrame(() => el.classList.add('show'));

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    el.classList.remove('show');
    el.classList.add('hide');
    setTimeout(() => el.remove(), 220);
  };

  el.querySelector('.toast-close').addEventListener('click', dismiss);
  const timer = setTimeout(dismiss, duration);
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', () => setTimeout(dismiss, 1200));

  return dismiss;
}

function toastSuccess(message) { return toast(message, 'success'); }
function toastError(message) { return toast(message, 'error'); }

/* ── Custom confirm dialog ──
   Replaces native confirm() with a styled modal matching the app's design.
   Usage: const ok = await confirmDialog('Hapus user ini?'); if (!ok) return; */
function confirmDialog(message, { title = 'Konfirmasi', confirmLabel = 'Ya, Lanjutkan', cancelLabel = 'Batal', danger = true } = {}) {
  return new Promise((resolve) => {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `
      <div class="modal" style="width:380px">
        <div class="modal-head">
          <div class="modal-title"></div>
        </div>
        <div class="fs-13 text-soft mb-18" style="line-height:1.6"></div>
        <div class="flex gap-10">
          <button class="btn btn-ghost flex-1" data-action="cancel"></button>
          <button class="btn ${danger ? '' : 'btn-primary'} flex-1" data-action="confirm" style="${danger ? 'background:var(--red);color:#fff' : ''}"></button>
        </div>
      </div>
    `;
    bg.querySelector('.modal-title').textContent = title;
    bg.querySelector('.fs-13').textContent = message;
    bg.querySelector('[data-action="cancel"]').textContent = cancelLabel;
    bg.querySelector('[data-action="confirm"]').textContent = confirmLabel;
    document.body.appendChild(bg);

    requestAnimationFrame(() => bg.classList.add('show'));

    function close(result) {
      bg.classList.remove('show');
      setTimeout(() => bg.remove(), 180);
      resolve(result);
    }

    bg.querySelector('[data-action="cancel"]').addEventListener('click', () => close(false));
    bg.querySelector('[data-action="confirm"]').addEventListener('click', () => close(true));
    bg.addEventListener('click', (e) => { if (e.target === bg) close(false); });
  });
}

/* ── Responsive mobile nav (off-canvas .sidebar drawer + overlay) ──
   Runs on every page automatically. Wires up any .nav-toggle-btn already
   present in the page's .head (see styles.css for the off-canvas rules)
   to open/close the .sidebar drawer, with a dimmed backdrop behind it. */
function initMobileNav() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const overlay = document.createElement('div');
  overlay.className = 'nav-overlay';
  document.body.appendChild(overlay);

  function closeNav() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  }

  function toggleNav() {
    const willOpen = !sidebar.classList.contains('open');
    if (willOpen) {
      sidebar.classList.add('open');
      overlay.classList.add('open');
    } else {
      closeNav();
    }
  }

  overlay.addEventListener('click', closeNav);
  document.querySelectorAll('.nav-toggle-btn').forEach((btn) => btn.addEventListener('click', toggleNav));
  sidebar.querySelectorAll('a, .new-btn').forEach((el) => el.addEventListener('click', closeNav));
  window.addEventListener('resize', () => { if (window.innerWidth > 900) closeNav(); });
}

document.addEventListener('DOMContentLoaded', initMobileNav);
