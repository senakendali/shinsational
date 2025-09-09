import { authService } from '../../services/authService.js';
import { showLoader, hideLoader } from '../../components/loader.js';
import { showToast } from '../../utils/toast.js';
import { showValidationErrors, clearAllErrors } from '../../utils/form.js';

export function render(target, params, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();

  // Reset body biar full
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.overflow = "hidden";

  target.innerHTML = `
    <div class="vh-100 bg-light d-flex align-items-center" style="margin:0;padding:0;background-image:url('/images/login-bg.png?v=${v}');background-size:cover;background-position:center;">
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

  // ✅ FIX: define form dulu baru addEventListener
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
      // contoh remember:
      // if (form.querySelector('#remember')?.checked) fd.append('remember', '1');

      await authService.login(fd);
      showToast('Login berhasil');

      const next = (query && query.redirect) ? query.redirect : '/';
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
}
