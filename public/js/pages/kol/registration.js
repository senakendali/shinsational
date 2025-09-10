const v = window.BUILD_VERSION;

const { renderHeaderKol }  = await import(`../../components/headerKol.js?v=${v}`);
const { renderFooterKol }  = await import(`../../components/footerKol.js?v=${v}`);

import { influencerService } from '../../services/influencerRegistrationService.js?v=${v}';
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
                
                <!-- Avatar di tengah atas -->
                <div class="text-center mb-3 d-none" id="avatarWrap">
                  <img id="avatarImg" src="" alt="TikTok Profile Picture"
                       style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.12);">
                </div>

                <div class="text-center mb-4">
                  <h2 class="fw-semibold mb-3 fs-4">Please Fill Your Information</h2>
                </div>

                <form id="registerForm" class="needs-validation w-100" novalidate>
                  <!-- Hidden fields -->
                  <input type="hidden" name="tiktok_user_id" id="tiktok_user_id" value="">
                  <input type="hidden" name="profile_pic_url" id="profile_pic_url" value="">
                  <input type="hidden" name="campaign_id" id="campaign_id" value="">
                  <input type="hidden" name="campaign" id="campaign" value="">

                  <!-- TikTok connect notice -->
                  <div id="tiktokConnectBox" class="alert alert-dark d-none" role="alert">
                    <div class="d-flex align-items-center justify-content-between">
                      <div>
                        <div class="fw-semibold">Connect your TikTok to autofill</div>
                        <small class="text-muted">We’ll only read your basic profile (name & avatar).</small>
                      </div>
                      <a id="connectTiktokBtn" class="btn btn-sm btn-light ms-3" href="#">
                        Connect TikTok
                      </a>
                    </div>
                  </div>

                  <div class="d-flex flex-column gap-3">

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

                  <button type="submit" class="btn btn-dark btn-lg w-100 py-2 mt-3 fw-semibold" id="submitBtn">
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
  const submitBtn = document.getElementById('submitBtn');

  // Hidden inputs
  const tiktokIdEl   = document.getElementById('tiktok_user_id');
  const avatarUrlEl  = document.getElementById('profile_pic_url');
  const campaignIdEl = document.getElementById('campaign_id');
  const campaignSlugEl = document.getElementById('campaign');

  // Visible inputs
  const fullNameEl = document.getElementById('full_name');
  const usernameEl = document.getElementById('tiktok_username');

  // Avatar preview & connect box
  const avatarWrap = document.getElementById('avatarWrap');
  const avatarImg  = document.getElementById('avatarImg');
  const connectBox = document.getElementById('tiktokConnectBox');
  const connectBtn = document.getElementById('connectTiktokBtn');

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

  // --- Parse campaign dari query: ?campaign=<slug> atau format lama ?<slug> ---
  (function applyCampaignFromQuery() {
    const u = new URL(location.href);
    let cId = u.searchParams.get('campaign_id');
    let cSlug = u.searchParams.get('campaign');

    if (!cId && !cSlug) {
      // fallback format lama: ?my-campaign-slug (tanpa key)
      const raw = u.search.replace(/^\?/, '');
      if (raw && !raw.includes('=')) cSlug = raw;
    }

    if (cId)   campaignIdEl.value = cId;
    if (cSlug) campaignSlugEl.value = cSlug;

    // Siapkan link connect TikTok agar membawa campaign juga
    const qs = new URLSearchParams();
    if (cId)   qs.set('campaign_id', cId);
    if (cSlug) qs.set('campaign', cSlug);
    connectBtn.href = `/auth/tiktok/redirect${qs.toString() ? '?' + qs.toString() : ''}`;
  })();

  // Prefill dari session TikTok (hasil OAuth callback) + tampilkan avatar
  (async () => {
    try {
      const res = await fetch('/me/tiktok', { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' });
      if (!res.ok) return;

      const data = await res.json();

      if (data?.tiktok_user_id) {
        tiktokIdEl.value = data.tiktok_user_id;
      }

      if (data?.tiktok_full_name && !fullNameEl.value) {
        fullNameEl.value = data.tiktok_full_name;
      }

      if (data?.tiktok_avatar_url) {
        avatarUrlEl.value = data.tiktok_avatar_url;
        avatarImg.src = data.tiktok_avatar_url;
        avatarWrap.classList.remove('d-none');
      } else {
        // belum connect → tampilkan box connect
        connectBox.classList.remove('d-none');
      }
    } catch (e) {
      console.warn('Prefill TikTok session failed:', e);
      connectBox.classList.remove('d-none');
    }
  })();

  // Submit handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    const formData = new FormData(form);

    try {
      showLoader();
      submitBtn.disabled = true;

      const resp = await influencerService.create(formData);

      hideLoader();
      submitBtn.disabled = false;

      showToast(resp.message || 'Registrasi berhasil disimpan.', 'success');

      // ➜ Redirect ke /my-profile (SPA-style)
      const next = '/my-profile';
      if (location.pathname !== next) {
        history.pushState(null, '', next);
        window.dispatchEvent(new PopStateEvent('popstate'));
        return; // stop eksekusi lanjutan setelah redirect
      }

      // (opsional) kalau tidak pakai SPA router, pakai:
      // window.location.href = '/my-profile';

    } catch (err) {
      hideLoader();
      submitBtn.disabled = false;

      if (err.status === 422 && err.errors) {
        showErrors(err.errors);
      } else {
        showToast(err.message || 'Gagal menyimpan registrasi.', 'error');
      }
    }
  });

}
