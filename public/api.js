/* ============================================================
   Medisiana - Shared API client & auth guard
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
  if (requiredRole && requiredRole !== 'any' && user.role !== requiredRole && user.role !== 'admin') {
    window.location.href = user.role === 'admin' ? 'admin-books.html' : 'home.html';
    return null;
  }
  return user;
}

function logout() {
  clearSession();
  window.location.href = 'index.html';
}

/* ── Idle auto-logout ──
   Logs the user out automatically after a period of no activity (mouse,
   keyboard, scroll, touch, click). Any activity resets the timer, so an
   active session never gets logged out mid-use. Only runs on protected
   pages that already have a valid session. */
const IDLE_LIMIT_MS = 15 * 60 * 1000; // 15 menit tanpa aktivitas
let idleTimer = null;

function resetIdleTimer() {
  if (!getToken()) return;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    clearSession();
    window.location.href = 'index.html?expired=1';
  }, IDLE_LIMIT_MS);
}

function initIdleLogout() {
  if (!getToken()) return;
  ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach((evt) => {
    document.addEventListener(evt, resetIdleTimer, { passive: true });
  });
  resetIdleTimer();
}

document.addEventListener('DOMContentLoaded', initIdleLogout);

/* ── Book source links ──
   Builds a clickable URL to a book's PDF, jumping to the cited page via the
   browser's native PDF viewer #page= fragment (see GET /books/:id/file). */
function bookFileUrl(bookId, page) {
  if (!bookId) return null;
  const url = `${API_BASE}/books/${bookId}/file?token=${encodeURIComponent(getToken() || '')}`;
  return page ? `${url}#page=${page}` : url;
}

/* ── Lightweight markdown renderer ──
   AI responses use **bold**, *italic*, "- " bullet lists, and blank-line
   paragraphs. Converts that to safe HTML (input is escaped first, so no
   markdown-in-markdown injection risk) instead of showing raw asterisks. */
function mdToHtml(text) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let html = esc(text || '');

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');

  const blocks = html.split(/\n{2,}/).map((block) => {
    const lines = block.split('\n');
    const isList = lines.every((l) => /^\s*[-•]\s+/.test(l)) && lines.length > 0;
    if (isList) {
      return `<ul>${lines.map((l) => `<li>${l.replace(/^\s*[-•]\s+/, '')}</li>`).join('')}</ul>`;
    }
    return `<p>${lines.join('<br>')}</p>`;
  });
  return blocks.join('');
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
function showToast(message, type = 'info') { return toast(message, type); }

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
  // Some pages (e.g. profile.html) render two .sidebar elements - one per
  // role - and hide the inactive one via inline display:none. Pick whichever
  // is actually visible, not just the first one in DOM order, otherwise the
  // hamburger button ends up toggling a sidebar nobody can see.
  const sidebars = document.querySelectorAll('.sidebar');
  let sidebar = null;
  sidebars.forEach((el) => { if (!sidebar && getComputedStyle(el).display !== 'none') sidebar = el; });
  if (!sidebar) sidebar = sidebars[0];
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

// ── User dropdown (topbar kanan) ──
function buildUserDropdown(user) {
  function initials(name) {
    return (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }
  const wrap = document.getElementById('user-dropdown-wrap');
  if (!wrap || !user) return;

  const avatarHtml = user.avatarUrl
    ? `<img src="${user.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`
    : initials(user.fullName);
  const role = user.angkatan ? `FK · Angkatan ${user.angkatan}` : (user.role === 'admin' ? 'Administrator' : 'Mahasiswa FK');

  wrap.innerHTML = `
    <button class="user-pill-btn" id="user-pill-btn" onclick="toggleUserDropdown()">
      <div class="av av-sm" style="background:var(--blue-soft);color:var(--blue-deep)" id="topbar-avatar">${avatarHtml}</div>
      <div class="user-pill-info">
        <div class="user-pill-name" id="topbar-name"></div>
        <div class="user-pill-role">${role}</div>
      </div>
      <i class="ti ti-chevron-down" style="font-size:14px;color:var(--ink-mut)"></i>
    </button>
    <div class="user-dropdown" id="user-dropdown">
      <a href="profile.html" class="user-dropdown-item">
        <i class="ti ti-settings"></i> Account Settings
      </a>
      <div class="user-dropdown-divider"></div>
      <div class="user-dropdown-item danger" onclick="confirmLogout()">
        <i class="ti ti-logout"></i> Keluar
      </div>
    </div>
  `;
  document.getElementById('topbar-name').textContent = user.fullName;

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) closeUserDropdown();
  });
}

function toggleUserDropdown() {
  document.getElementById('user-dropdown')?.classList.toggle('open');
}
function closeUserDropdown() {
  document.getElementById('user-dropdown')?.classList.remove('open');
}

async function confirmLogout() {
  closeUserDropdown();
  const ok = await confirmDialog('Kamu yakin ingin keluar dari Medisiana?', {
    title: 'Konfirmasi Keluar',
    confirmLabel: 'Ya, Keluar',
    cancelLabel: 'Batal',
    danger: true,
  });
  if (ok) logout();
}
