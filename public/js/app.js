// import { renderHeader } from './components/header.js'; // tetap off
import { showLoader, hideLoader } from './components/loader.js';
import { installNavbarBackgroundController, applyNavbarBackgroundNow } from './components/headerScroll.js';

let routes = []; // akan diisi setelah dynamic import

function adjustAppPadding() {
  const header = document.querySelector(".shrinkable-navbar");
  const app = document.getElementById("app");
  if (header && app) {
    const headerHeight = header.offsetHeight;
    app.style.paddingTop = `15px`;
  }
}

function matchRoute(pathname) {
  for (const route of routes) {
    // exact
    if (route.path === pathname) return { route, params: {} };

    // dynamic segments: /path/:id
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

document.addEventListener("DOMContentLoaded", async () => {
  setTimeout(() => requestAnimationFrame(adjustAppPadding), 50);
  installNavbarBackgroundController();

  const content = document.getElementById("app");
  const v = window.BUILD_VERSION || Date.now();

  // 🔥 dynamic import routes.js
  try {
    const mod = await import(`/js/config/routes.js?v=${v}`);
    routes = mod.routes || [];
  } catch (err) {
    console.error("[SPA] Gagal load routes.js:", err);
    content.innerHTML = `<h4>Gagal memuat konfigurasi routes</h4>`;
    return;
  }

  async function loadPage(path) {
    showLoader();

    const url = new URL(path, location.origin);
    const pathname = url.pathname;
    const query = Object.fromEntries(url.searchParams.entries());

    // ❌ HAPUS fallback ke /dashboard
    // ✅ cari match apa adanya; kalau tidak ada dan bukan root, fallback ke root (home/KOL)
    let match = matchRoute(pathname);
    if (!match && pathname !== "/") {
      match = matchRoute("/"); // fallback ke home
    }

    content.innerHTML = ""; // reset konten

    if (!match) {
      hideLoader();
      content.innerHTML = `<h4>404 - Halaman <code>${path}</code> tidak ditemukan</h4>`;
      return;
    }

    const { route, params } = match;

    try {
      // route.component harus fungsi yang mengembalikan import() module
      const module = await route.component(v);
      await module.render(content, params, query, route.label);

      if (location.pathname + location.search !== path) {
        history.pushState({}, "", path);
      }

      requestAnimationFrame(adjustAppPadding);
      applyNavbarBackgroundNow();
    } catch (err) {
      console.error("[SPA] Gagal load halaman:", path, err);
      alert(`❌ Gagal load halaman: ${path}\n\n${err}`);
      content.innerHTML = `<h4>404 - Halaman <code>${path}</code> tidak ditemukan</h4>`;
    } finally {
      hideLoader();
    }
  }

  // back/forward
  window.addEventListener("popstate", () => {
    loadPage(location.pathname + location.search);
  });

  // Tangkap klik anchor internal (logo/menu), ga perlu class .app-link
  document.body.addEventListener("click", function (e) {
    const a = e.target.closest('a[href^="/"]');
    if (!a) return;

    // biarkan external style
    if (a.target === "_blank" || a.hasAttribute("data-external")) return;

    e.preventDefault();
    const hrefUrl = new URL(a.href);
    const href = hrefUrl.pathname + hrefUrl.search;
    loadPage(href);
  });

  // ✅ INIT: biarkan "/" tetap ke halaman KOL
  const initialPath = location.pathname + location.search;
  loadPage(initialPath);
});

window.addEventListener("resize", adjustAppPadding);
window.addEventListener("load", adjustAppPadding);
