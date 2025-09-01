// pages/registration.js
import { renderHeaderKol } from "../../components/headerKol.js";
import { renderFooterKol } from "../../components/footerKol.js";

import { influencerService } from '../../services/influencerRegistrationService.js';
import { showLoader, hideLoader } from '../../components/loader.js';
import { showToast } from '../../utils/toast.js';

export function render(target, params, query = {}, labelOverride = null) {
  renderHeaderKol("header");

  target.innerHTML = `
    <section class="page-section min-vh-100 d-flex align-items-center">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-5 col-md-8">
            <div class="card">
              <div class="card-body p-4 p-md-5">
                <div class="text-center mb-4">
                  <h2 class="fw-semibold mb-3 fs-4">Please Fill Your Information</h2>
                </div>

                <form id="registerForm" class="needs-validation w-100" novalidate>
                  <div class="d-flex flex-column gap-3">

                    <input type="hidden" name="tiktok_user_id" id="tiktok_user_id" value="">

                    <div class="form-group">
                      <input type="text" class="form-control form-control-lg" id="full_name" name="full_name" placeholder="Full Name" required>
                      <div class="invalid-feedback"></div>
                    </div>

                    <div class="form-group">
                      <input type="text" class="form-control form-control-lg" id="tiktok_username" name="tiktok_username" placeholder="TikTok Username" required>
                      <div class="invalid-feedback"></div>
                    </div>

                    <div class="form-group">
                      <input type="tel" class="form-control form-control-lg" id="phone" name="phone" placeholder="Phone Number" required>
                      <div class="invalid-feedback"></div>
                    </div>

                    <div class="form-group">
                      <input type="text" class="form-control form-control-lg" id="address" name="address" placeholder="Address" required>
                      <div class="invalid-feedback"></div>
                    </div>

                    <div class="form-group">
                      <input type="date" class="form-control form-control-lg" id="birth_date" name="birth_date" placeholder="Birth Date" required>
                      <div class="invalid-feedback"></div>
                    </div>
                  </div>

                  <button type="submit" class="btn btn-dark btn-lg w-100 py-2 mt-3 fw-semibold">
                    Register
                  </button>
                </form>

              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  renderFooterKol();

  const form = document.getElementById('registerForm');
  const tiktokIdEl = document.getElementById('tiktok_user_id');
  const fullNameEl = document.getElementById('full_name');
  const usernameEl = document.getElementById('tiktok_username');

  const clearErrors = () => {
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    form.querySelectorAll('.invalid-feedback').forEach(el => (el.textContent = ''));
  };

  const showErrors = (errors = {}) => {
    Object.entries(errors).forEach(([field, messages]) => {
      const input = form.querySelector(`[name="${field}"]`);
      if (!input) return;
      input.classList.add('is-invalid');
      const fb = input.closest('.form-group')?.querySelector('.invalid-feedback');
      if (fb) fb.textContent = Array.isArray(messages) ? messages[0] : String(messages);
    });
  };

  // Prefill dari session TikTok (hasil OAuth callback)
  (async () => {
    try {
      const res = await fetch('/me/tiktok', { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' });
      if (!res.ok) return;

      const data = await res.json();
      if (data?.tiktok_user_id) {
        tiktokIdEl.value = data.tiktok_user_id;
      }
      if (data?.tiktok_username) {
        usernameEl.value = data.tiktok_username;
        usernameEl.readOnly = true; // biar gak diubah manual
      }
      if (data?.tiktok_full_name) {
        fullNameEl.value = data.tiktok_full_name;
      }
    } catch (e) {
      console.warn('Prefill TikTok session failed:', e);
    }
  })();

  // Submit handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const formData = new FormData(form);

    try {
      showLoader();

      const resp = await influencerService.create(formData);

      hideLoader();
      showToast('success', resp.message || 'Registrasi berhasil disimpan.');
      form.reset();
    } catch (err) {
      hideLoader();
      if (err.status === 422 && err.errors) {
        showErrors(err.errors);
      } else {
        showToast('error', err.message || 'Gagal menyimpan registrasi.');
      }
    }
  });
}
