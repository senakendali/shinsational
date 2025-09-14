// /js/pages/auth/login.js
export function render(target, params, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();
  const BASE = (window.APP_URL || window.location.origin).replace(/\/+$/, '');
  const bgUrl = `${BASE}/images/login-bg.png?v=${v}`;

  // === Helper: inject CSS override supaya padding-top ilang total saat login ===
  function applyLoginStyleOverrides() {
    const id = 'login-page-overrides';
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      style.textContent = `
        /* Hilangin semua padding/margin top yang biasa dipakai layout */
        #app, #app .main, #app main, .main, main {
          padding-top: 0 !important;
          margin-top: 0 !important;
        }
      `;
      document.head.appendChild(style);
    }
    return () => style && style.remove();
  }
  const removeLoginStyleOverrides = applyLoginStyleOverrides();

  // Pastikan #app tidak pakai container-fluid saat login
  const appEl = document.getElementById('app');
  const hadContainerFluid = !!appEl?.classList.contains('container-fluid');
  if (appEl) appEl.classList.remove('container-fluid');

  // Reset body biar full (login page nggak perlu scroll)
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.overflow = "hidden";

  target.innerHTML = `
    <div class="vh-100 bg-light d-flex align-items-center"
         style="margin:0;padding:0;background-image:url('${bgUrl}');background-size:cover;background-position:center;">
      <div class="container-fluid">
        <div class="row g-0">
          <!-- Left side (empty) -->
          <div class="col-md-6"></div>

          <!-- Right side (form) -->
          <div class="col-md-6 d-flex align-items-center justify-content-end" style="padding-right:5rem;">
            <div>
              <div class="mb-3">
                <h2 class="fw-semibold mb-2">Please sign in</h2>
              </div>

              <form id="loginForm">
                <div>
                  <div>
                    <input type="email" class="border rounded-top border-bottom-0 login-input" id="email" name="email" placeholder="Email address">
                  </div>
                </div>

                <div class="mb-2">
                  <div>
                    <input type="password" class="border rounded-bottom login-input" id="password" name="password" placeholder="Password">
                  </div>
                </div>

                <button type="submit" class="btn button-primary">
                  <span>Sign in</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Ambil flash dari guard (kalau sebelumnya di-redirect dari halaman admin)
  const flashError = (() => {
    try {
      const msg = sessionStorage.getItem('FLASH_ERROR');
      if (msg) sessionStorage.removeItem('FLASH_ERROR');
      return msg;
    } catch { return null; }
  })();
  const flashInfo = (() => {
    try {
      const msg = sessionStorage.getItem('FLASH_INFO');
      if (msg) sessionStorage.removeItem('FLASH_INFO');
      return msg;
    } catch { return null; }
  })();

  // Dynamic imports
  Promise.all([
    import(`/js/services/authService.js?v=${v}`),
    import(`/js/components/loader.js?v=${v}`),
    import(`/js/utils/toast.js?v=${v}`),
    import(`/js/utils/form.js?v=${v}`),
  ])
    .then(([authMod, loaderMod, toastMod, formMod]) => {
      const { authService } = authMod;
      const { showLoader, hideLoader } = loaderMod;
      const { showToast } = toastMod;
      const { showValidationErrors, clearAllErrors } = formMod;

      // Tampilkan toast flash (kalau ada)
      if (flashError) showToast(flashError, 'error');
      if (flashInfo) showToast(flashInfo);

      const form = document.getElementById('loginForm');
      if (!form) {
        console.error('Login form not found');
        return;
      }

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader();
        clearAllErrors();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalHtml = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Mengirim...`;

        try {
          const fd = new FormData(form);
          await authService.login(fd);
          showToast('Login berhasil');

          // Pulihkan class container-fluid pada #app kalau awalnya ada
          if (appEl && hadContainerFluid) {
            appEl.classList.add('container-fluid');
          }

          // Bersihkan override CSS login & pulihkan scroll
          removeLoginStyleOverrides();
          document.body.style.overflow = '';

          // Tentukan halaman tujuan:
          // 1) AFTER_LOGIN_REDIRECT dari guard
          // 2) ?redirect= dari query
          // 3) default: /admin/dashboard
          let next =
            (() => { try { return sessionStorage.getItem('AFTER_LOGIN_REDIRECT') || ''; } catch { return ''; } })()
            || (query && query.redirect) || '/admin/dashboard';

          // Bersihkan AFTER_LOGIN_REDIRECT biar nggak kepakai lagi
          try { sessionStorage.removeItem('AFTER_LOGIN_REDIRECT'); } catch {}

          history.pushState(null, '', next);
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (err) {
          if (err?.errors) showValidationErrors(err.errors);
          showToast(err?.message || 'Login gagal.', 'error');
          if (err?.status === 419) showToast('Sesi kadaluarsa, refresh dulu ya.', 'error');
        } finally {
          hideLoader();
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalHtml;
        }
      });
    })
    .catch((err) => {
      console.error('[login] Failed to import modules', err);
    });
}
