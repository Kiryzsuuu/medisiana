/* ============================================================
   Medisiana — Shared Navigation & UI Script
   ============================================================ */

// ── Active nav highlight ──
document.addEventListener('DOMContentLoaded', () => {
  const page = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.dataset.page === page) el.classList.add('active');
  });
});

// ── Sidebar builder (shared) ──
function buildSidebar(role = 'student') {
  const studentNav = [
    { page: 'dashboard.html', icon: 'ti-layout-dashboard', label: 'Dashboard'       },
    { page: 'chat.html',      icon: 'ti-robot',            label: 'Medina AI'        },
    { page: 'rooms.html',     icon: 'ti-users',            label: 'Study Room'       },
    { page: 'cases.html',     icon: 'ti-stethoscope',      label: 'Diskusi Kasus'    },
  ];

  const adminNav = [
    { page: 'admin-books.html',     icon: 'ti-books',      label: 'Kelola Buku'     },
    { page: 'admin-users.html',     icon: 'ti-users',      label: 'Kelola User'     },
    { page: 'admin-ai.html',        icon: 'ti-robot',      label: 'Konfigurasi AI'  },
    { page: 'admin-analytics.html', icon: 'ti-chart-bar',  label: 'Analytics'       },
  ];

  const nav   = role === 'admin' ? adminNav : studentNav;
  const label = role === 'admin' ? 'Admin'  : 'Menu';

  const user  = role === 'admin'
    ? { initials: 'AD', name: 'Administrator', role: 'Admin', style: 'background:#FEF3C7;color:#D97706' }
    : { initials: 'AR', name: 'Arif Rahman',   role: 'FK • Angkatan 2022', style: '' };

  return `
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-mark">
          <div class="logo-icon"><i class="ti ti-dna" aria-hidden="true"></i></div>
          <div class="logo-text">Medisiana</div>
        </div>
        <div class="logo-sub">${role === 'admin' ? 'Panel Admin' : 'Platform FK S1'}</div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section">${label}</div>
        ${nav.map(n => `
          <a href="${n.page}" class="nav-item" data-page="${n.page}">
            <i class="ti ${n.icon}" aria-hidden="true"></i>
            <span>${n.label}</span>
          </a>
        `).join('')}
      </nav>

      <div class="sidebar-bottom">
        <div class="user-pill">
          <div class="avatar" style="${user.style}">${user.initials}</div>
          <div>
            <div class="user-pill-name">${user.name}</div>
            <div class="user-pill-role">${user.role}</div>
          </div>
        </div>
      </div>
    </aside>
  `;
}

// ── Topbar builder ──
function buildTopbar(title, extras = '') {
  return `
    <header class="topbar">
      <div class="topbar-title">${title}</div>
      ${extras}
      <a href="index.html" class="btn btn-ghost btn-sm" style="margin-left:8px">
        <i class="ti ti-logout" aria-hidden="true"></i> Keluar
      </a>
    </header>
  `;
}
