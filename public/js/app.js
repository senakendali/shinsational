// /js/app.js

// import { renderHeader } from './components/header.js'; // tetap off
import { showLoader, hideLoader } from './components/loader.js';
import { installNavbarBackgroundController, applyNavbarBackgroundNow } from './components/headerScroll.js';
import { installAuthInterceptor } from './utils/auth-guard.js';

let routes = []; // akan diisi setelah dynamic import

function ensureScrollable() {
  try {
    document.documentElement.style.overflowY = 'auto';
    document.body.style.overflowY = 'auto';
    document.body.classList.remove('overflow-hidden', 'modal-open');
    document.documentElement.style.height = '';
    document.body.style.height = '';
    const app = document.getElementById('app');
    if (app) {
      app.style.paddingTop = '';
      app.style.minHeight = '';
      app.style.overflow = '';
      app.style.height = '';
    }
  } catch {}
}

function matchRoute(pathname) {
  for (const route of routes) {
    if (route.path === pathname) return { route, params: {} };

    const routeParts = route.path.split('/');
    const pathParts = pathname.split('/');
    if (routeParts.length !== pathParts.length) continue;

    const params = {};
    const isMatch = routeParts.every((part, i) => {
      if (part.startsWith(':')) { params[part.slice(1)] = pathParts[i]; return true; }
      return part === pathParts[i];
    });
    if (isMatch) return { route, params };
  }
  return null;
}

// ==== Admin guard helpers ====
const LOGIN_PATH = '/admin/login';
const ADMIN_PREFIX = '/admin';

// admin route? (kecuali halaman login)
function isAdminPath(pathname) {
  if (!pathname) return false;
  return pathname.startsWith(ADMIN_PREFIX) && !pathname.startsWith(LOGIN_PATH);
}

// pre-check auth sebelum render halaman admin
async function assertAuthenticatedFor(pathname) {
  if (!isAdminPath(pathname)) return true; // non-admin: skip
  try {
    const res = await fetch('/api/me', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    if (res.status === 401) {
      try {
        sessionStorage.setItem('FLASH_ERROR', 'Harus login dulu.');
        sessionStorage.setItem('AFTER_LOGIN_REDIRECT', location.pathname + location.search);
      } catch {}
      location.replace(LOGIN_PATH);
      return false;
    }
    // kalau 200 OK (atau 403/404 non-ideal), biarkan SPA lanjut.
    return true;
  } catch {
    // network error: biarkan lanjut, fetch lain akan diintercept juga
    return true;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  installNavbarBackgroundController();

  // 🔐 pasang fetch 401 interceptor khusus area /admin
  installAuthInterceptor({ loginPath: LOGIN_PATH, adminPrefix: ADMIN_PREFIX });

  const content = document.getElementById('app');
  const v = window.BUILD_VERSION || Date.now();

  // 🔥 dynamic import routes.js
  try {
    const mod = await import(`/js/config/routes.js?v=${v}`);
    routes = mod.routes || [];
  } catch (err) {
    console.error('[SPA] Gagal load routes.js:', err);
    if (content) content.innerHTML = `<h4>Gagal memuat konfigurasi routes</h4>`;
    ensureScrollable();
    return;
  }

  async function loadPage(path) {
    showLoader();

    const url = new URL(path, location.origin);
    const pathname = url.pathname;
    const query = Object.fromEntries(url.searchParams.entries());

    // ⛔ pre-auth check utk halaman admin
    const ok = await assertAuthenticatedFor(pathname);
    if (!ok) {
      hideLoader();
      ensureScrollable();
      return; // sudah di-redirect ke login oleh guard
    }

    let match = matchRoute(pathname);
    if (!match && pathname !== '/') {
      match = matchRoute('/'); // fallback ke home
    }

    if (content) content.innerHTML = ''; // reset konten

    if (!match) {
      hideLoader();
      ensureScrollable();
      if (content) content.innerHTML = `<h4>404 - Halaman <code>${path}</code> tidak ditemukan</h4>`;
      return;
    }

    const { route, params } = match;

    try {
      // route.component harus fungsi yang mengembalikan import() module
      const module = await route.component(v);
      await module.render(content, params, query, route.label);

      // sinkronkan URL bila berubah
      if (location.pathname + location.search !== path) {
        history.pushState({}, '', path);
      }

      // setelah render, pastikan scroll bebas & header bg apply
      requestAnimationFrame(() => {
        ensureScrollable();
        applyNavbarBackgroundNow();
      });
    } catch (err) {
      console.error('[SPA] Gagal load halaman:', path, err);
      alert(`❌ Gagal load halaman: ${path}\n\n${err}`);
      if (content) content.innerHTML = `<h4>404 - Halaman <code>${path}</code> tidak ditemukan</h4>`;
    } finally {
      hideLoader();
      ensureScrollable();
    }
  }

  // back/forward
  window.addEventListener('popstate', () => {
    loadPage(location.pathname + location.search);
  });

  // Tangkap klik anchor internal (logo/menu)
  document.body.addEventListener('click', function (e) {
    const a = e.target.closest('a[href^="/"]');
    if (!a) return;
    if (a.target === '_blank' || a.hasAttribute('data-external')) return;

    e.preventDefault();
    const hrefUrl = new URL(a.href);
    const href = hrefUrl.pathname + hrefUrl.search;
    loadPage(href);
  });

  // ✅ INIT
  ensureScrollable();
  const initialPath = location.pathname + location.search;
  loadPage(initialPath);
});

// Global listeners
window.addEventListener('resize', ensureScrollable);
window.addEventListener('load', ensureScrollable);
