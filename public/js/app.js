// import { renderHeader } from './components/header.js'; // tetap off
// HAPUS import routes statis
// import { routes } from './config/routes.js';

import { showLoader, hideLoader } from './components/loader.js';
import { installNavbarBackgroundController, applyNavbarBackgroundNow } from './components/headerScroll.js';

let routes = []; // akan diisi setelah dynamic import

function adjustAppPadding() {
  const header = document.querySelector(".shrinkable-navbar");
  const app = document.getElementById("app");
  if (header && app) {
    const headerHeight = header.offsetHeight;
    app.style.paddingTop = `${headerHeight}px`;
  }
}

function matchRoute(pathname) {
  for (const route of routes) {
    if (route.path === pathname) return { route, params: {} };

    const routeParts = route.path.split('/');
    const pathParts = pathname.split('/');

    if (routeParts.length !== pathParts.length) continue;

    let params = {};
    let isMatch = routeParts.every((part, i) => {
      if (part.startsWith(':')) {
        params[part.slice(1)] = pathParts[i];
        return true;
      }
      return part === pathParts[i];
    });

    if (isMatch) return { route, params };
  }

  return null;
}

document.addEventListener("DOMContentLoaded", async () => {
  // renderHeader();
  setTimeout(() => requestAnimationFrame(adjustAppPadding), 50);

  installNavbarBackgroundController();

  const content = document.getElementById("app");
  const v = window.BUILD_VERSION || Date.now();

  // 🔥 Dynamic import untuk routes.js dengan version
  try {
    const mod = await import(`/js/config/routes.js?v=${v}`);
    // Expect `export const routes = [...]` dari routes.js
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
    const match = matchRoute(pathname) || matchRoute("/dashboard");

    const content = document.getElementById("app");
    content.innerHTML = ""; // reset agar tidak nimbun form/index

    if (!match) {
      content.innerHTML = `<h4>404 - Halaman <code>${path}</code> tidak ditemukan</h4>`;
      return hideLoader();
    }

    const { route, params } = match;

    try {
      // ⬇️ route.component sebaiknya melakukan dynamic import page dengan `?v=${v}` di dalam routes.js
      // Di sini kita pass `v` kalau route.component ingin memakainya
      const module = await route.component(v);

      // Berikan label ke render (biar renderBreadcrumb bisa pakai)
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

  // Untuk back/forward
  window.addEventListener("popstate", () => {
    loadPage(location.pathname + location.search);
  });

  // Delegated link handler (semua elemen .app-link)
  document.body.addEventListener("click", function (e) {
    const link = e.target.closest(".app-link");
    if (link) {
      e.preventDefault();
      const href = new URL(link.href).pathname + link.search;
      loadPage(href);
    }
  });

  const initialPath = location.pathname + location.search;
  loadPage(initialPath === "/" ? "/dashboard" : initialPath);
});

window.addEventListener("resize", adjustAppPadding);
window.addEventListener("load", adjustAppPadding);
