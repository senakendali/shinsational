// /js/components/header.js
export async function renderHeader(targetId = "header") {
  const v = window.BUILD_VERSION || Date.now();
  const container = document.getElementById(targetId);
  if (!container) return;

  container.innerHTML = `
    <div class="shrinkable-navbar app-header">
      <!-- Bar Atas -->
      <div class="border-bottom py-2 px-3">
        <div class="container-fluid d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-4">
            <a class="navbar-brand app-link" data-href="/admin" href="/admin">
              <img src="/images/logo-admin.png" alt="Logo" class="d-inline-block align-text-top logo">
            </a>
          </div>

          <div class="d-flex align-items-center gap-3 flex-grow-1 justify-content-end">
            <nav class="navbar navbar-expand-lg">
              <div class="container-fluid">
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                  <span class="navbar-toggler-icon"></span>
                </button>

                <div class="collapse navbar-collapse" id="navbarNav">
                  <ul class="navbar-nav ms-auto" id="navbar-menu">
                    <!-- placeholder sementara -->
                    <li class="nav-item"><span class="nav-link disabled">Loading…</span></li>
                  </ul>
                </div>
              </div>
            </nav>
          </div>
        </div>
      </div>
      <!-- Bar Navigasi (diisi navbar.js) -->
    </div>
  `;

  // SPA link handler (opsional, kalau kamu pakai app-link di project)
  container.querySelectorAll('.app-link').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('data-href');
      if (href) {
        e.preventDefault();
        history.pushState(null, '', href);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    });
  });

  // Dynamic import navbar realtime (dengan cache-buster ?v=)
  try {
    const mod = await import(`/js/components/navbar.js?v=${v}`);
    const renderNavbar = mod.renderNavbar || mod.default;
    const navEl = container.querySelector('#navbar-menu');

    // Support 2 gaya signature:
    // - renderNavbar(element)
    // - renderNavbar(selectorString)
    if (renderNavbar.length >= 1) {
      await renderNavbar(navEl ?? '#navbar-menu');
    } else {
      await renderNavbar(); // kalau modul lama tidak butuh argumen
    }
  } catch (err) {
    console.error('[header] Failed to import navbar.js', err);
    // Fallback minimal supaya UI tetap usable
    const navEl = container.querySelector('#navbar-menu');
    if (navEl) {
      navEl.innerHTML = `
        <li class="nav-item"><a class="nav-link app-link" data-href="/admin" href="/admin">Dashboard</a></li>
        <li class="nav-item"><a class="nav-link app-link" data-href="/admin/campaigns" href="/admin/campaigns">Campaigns</a></li>
        <li class="nav-item"><a class="nav-link app-link" data-href="/admin/submissions" href="/admin/submissions">Submissions</a></li>
      `;
      // re-bind SPA nav pada fallback
      navEl.querySelectorAll('.app-link').forEach(a => {
        a.addEventListener('click', (e) => {
          const href = a.getAttribute('data-href');
          if (href) {
            e.preventDefault();
            history.pushState(null, '', href);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        });
      });
    }
  }
}
