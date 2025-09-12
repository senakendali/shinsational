// import { renderHeader } from './components/header.js'; // tetap off
import { showLoader, hideLoader } from './components/loader.js';
import { installNavbarBackgroundController, applyNavbarBackgroundNow } from './components/headerScroll.js';

let routes = []; // akan diisi setelah dynamic import

function ensureScrollable() {
  try {
    // Pulihkan scroll yang mungkin dikunci loader/modal
    document.documentElement.style.overflowY = 'auto';
    document.body.style.overflowY = 'auto';
    document.body.classList.remove('overflow-hidden', 'modal-open');

    // Jangan kunci tinggi; biarkan konten menambah tinggi halaman
    document.documentElement.style.height = '';
    document.body.style.height = '';

    // Bersihkan style yang mungkin diset sebelumnya pada #app
    const app = document.getElementById('app');
    if (app) {
      app.style.paddingTop = '';     // we don’t need top padding
      app.style.minHeight = '';      // biarkan natural height
      app.style.overflow = '';       // biarkan ikut body
      app.style.height = '';         // no fixed height
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

document.addEventListener('DOMContentLoaded', async () => {
  installNavbarBackgroundController();

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
