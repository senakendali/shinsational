// /js/pages/not-found.js
export async function render(target, path, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();

  const [
    { renderHeader },
    { renderBreadcrumb },
    { showToast },
    loaderMod,
  ] = await Promise.all([
    import(`/js/components/header.js?v=${v}`),
    import(`/js/components/breadcrumb.js?v=${v}`),
    import(`/js/utils/toast.js?v=${v}`),
    import(`/js/components/loader.js?v=${v}`),
  ]);

  const { showLoader, hideLoader } = loaderMod;

  // helpers
  const $ = (s) => target.querySelector(s);
  const isAdmin = location.pathname.startsWith('/admin');
  const homeHref = isAdmin ? '/admin' : '/';
  const dashHref = isAdmin ? '/admin/dashboard' : '/kol';

  target.innerHTML = '';
  showLoader();
  renderHeader('header');
  renderBreadcrumb(target, path, labelOverride || 'Not Found');

  target.innerHTML += `
    <div class="bg-white rounded shadow-sm p-4 text-center">
      <div class="d-flex flex-column align-items-center gap-2">
        <div class="display-5 fw-bold text-danger">
          <i class="bi bi-exclamation-octagon-fill me-2"></i>404
        </div>
        <h5 class="mb-1 text-uppercase">Halaman Tidak Ditemukan</h5>
        <div class="text-muted mb-3">URL yang kamu tuju tidak tersedia, dipindahkan, atau salah ketik.</div>

        <div class="d-flex flex-wrap justify-content-center gap-2 mb-2">
          <button id="btnBack" class="btn btn-outline-secondary">
            <i class="bi bi-arrow-left"></i> Kembali
          </button>
          <a href="${homeHref}" class="btn btn-outline-primary app-link">
            <i class="bi bi-house"></i> Ke Beranda
          </a>
          <a href="${dashHref}" class="btn btn-primary app-link">
            <i class="bi bi-speedometer2"></i> Buka Dashboard
          </a>
        </div>

        <div class="small text-muted">
          Path: <code id="nf-path">${location.pathname}</code>
          <button id="btnCopyPath" class="btn btn-sm btn-light ms-2">
            <i class="bi bi-clipboard"></i> salin
          </button>
        </div>
      </div>
    </div>

    <div class="mt-4 row g-3">
      <div class="col-12 col-lg-6">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title text-uppercase mb-2"><i class="bi bi-life-preserver"></i> Bantuan Cepat</h6>
            <p class="text-muted small mb-2">Menu yang sering dipakai:</p>
            <ul class="list-group">
              ${
                isAdmin
                  ? `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      <span><i class="bi bi-bag me-2"></i> Campaigns</span>
                      <a class="btn btn-sm btn-outline-primary app-link" href="/admin/campaigns">Buka</a>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      <span><i class="bi bi-building me-2"></i> Brands</span>
                      <a class="btn btn-sm btn-outline-primary app-link" href="/admin/brands">Buka</a>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      <span><i class="bi bi-people me-2"></i> Users</span>
                      <a class="btn btn-sm btn-outline-primary app-link" href="/admin/users">Buka</a>
                    </li>
                  `
                  : `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      <span><i class="bi bi-person-badge me-2"></i> KOL Landing</span>
                      <a class="btn btn-sm btn-outline-primary app-link" href="/kol">Buka</a>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      <span><i class="bi bi-clipboard-check me-2"></i> KOL Registration</span>
                      <a class="btn btn-sm btn-outline-primary app-link" href="/registration">Buka</a>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      <span><i class="bi bi-person-circle me-2"></i> My Profile</span>
                      <a class="btn btn-sm btn-outline-primary app-link" href="/my-profile">Buka</a>
                    </li>
                  `
              }
            </ul>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-6">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title text-uppercase mb-2"><i class="bi bi-search"></i> Pergi ke Halaman Tertentu</h6>
            <div class="input-group">
              <span class="input-group-text">${isAdmin ? '/admin' : ''}</span>
              <input id="nf-jump" type="text" class="form-control" placeholder="mis: /campaigns atau /brands">
              <button id="nf-go" class="btn btn-primary"><i class="bi bi-caret-right-fill"></i></button>
            </div>
            <div class="form-text">Masukkan path relatif lalu tekan panah untuk pergi.</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // events
  $('#btnBack')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (history.length > 1) history.back();
    else {
      history.pushState(null, '', homeHref);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  });

  $('#btnCopyPath')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.pathname + location.search);
      showToast('Path disalin ke clipboard.');
    } catch {
      showToast('Gagal menyalin path.', 'error');
    }
  });

  // Jump to path helper
  $('#nf-go')?.addEventListener('click', () => {
    const raw = String($('#nf-jump')?.value || '').trim();
    if (!raw) return;
    const p = raw.startsWith('/') ? raw : `/${raw}`;
    const dest = (isAdmin ? '/admin' : '') + p;
    history.pushState(null, '', dest);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  // SPA link wiring
  target.querySelectorAll('.app-link').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const href = a.getAttribute('href');
      if (!href) return;
      history.pushState(null, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  });

  hideLoader();
}

export default { render };
