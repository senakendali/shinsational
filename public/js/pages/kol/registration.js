// /js/pages/kol/register.js
export function render(target, params, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();

  // Markup
  target.innerHTML = `
    <section class="page-section min-vh-100 d-flex align-items-center">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-5 col-md-8">
            <div class="card">
              <div class="card-body p-4 p-md-5">

                <!-- Avatar -->
                <div class="text-center mb-3 d-none" id="avatarWrap">
                  <img id="avatarImg" src="" alt="TikTok Profile Picture"
                       style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.12);">
                </div>

                <div class="text-center mb-4">
                  <h2 class="fw-semibold mb-3 fs-4">Please Fill Your Information</h2>
                </div>

                <form id="registerForm" class="needs-validation w-100" novalidate>
                  <!-- Hidden -->
                  <input type="hidden" name="tiktok_user_id" id="tiktok_user_id" value="">
                  <input type="hidden" name="profile_pic_url" id="profile_pic_url" value="">
                  <input type="hidden" name="campaign_id" id="campaign_id" value="">
                  <input type="hidden" name="campaign" id="campaign" value="">

                  <!-- Connect TikTok -->
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

                  <div id="alreadyBox" class="alert alert-success d-none" role="alert">
                    You are already registered for this campaign. Your data has been loaded.
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

                  <div class="mt-3 d-grid gap-2">
                    <button type="submit" class="btn btn-dark btn-lg w-100 py-2 fw-semibold" id="submitBtn">
                      Register
                    </button>
                    <a href="/my-profile" class="btn btn-outline-dark w-100 d-none" id="goProfileBtn">
                      Lihat Profil
                    </a>
                  </div>
                </form>

              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  // Dynamic imports (mirip index.js)
  Promise.all([
    import(`/js/components/headerKol.js?v=${v}`),
    import(`/js/components/footerKol.js?v=${v}`),
    import(`/js/services/influencerRegistrationService.js?v=${v}`),
    import(`/js/components/loader.js?v=${v}`),
    import(`/js/utils/toast.js?v=${v}`),
  ])
  .then(async ([headerMod, footerMod, serviceMod, loaderMod, toastMod]) => {
    const { renderHeaderKol } = headerMod;
    const { renderFooterKol } = footerMod;
    const { influencerService } = serviceMod;
    const { showLoader, hideLoader } = loaderMod;
    const { showToast } = toastMod;

    renderHeaderKol("header");
    renderFooterKol();

    const form = document.getElementById('registerForm');
    const submitBtn = document.getElementById('submitBtn');
    const goProfileBtn = document.getElementById('goProfileBtn');

    // Hidden
    const tiktokIdEl   = document.getElementById('tiktok_user_id');
    const avatarUrlEl  = document.getElementById('profile_pic_url');
    const campaignIdEl = document.getElementById('campaign_id');
    const campaignSlugEl = document.getElementById('campaign');

    // Visible
    const fullNameEl   = document.getElementById('full_name');
    const usernameEl   = document.getElementById('tiktok_username');
    const phoneEl      = document.getElementById('phone');
    const addressEl    = document.getElementById('address');
    const birthDateEl  = document.getElementById('birth_date');

    // UI boxes
    const avatarWrap = document.getElementById('avatarWrap');
    const avatarImg  = document.getElementById('avatarImg');
    const connectBox = document.getElementById('tiktokConnectBox');
    const connectBtn = document.getElementById('connectTiktokBtn');
    const alreadyBox = document.getElementById('alreadyBox');

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

    const setReadonly = (flag) => {
      [fullNameEl, usernameEl, phoneEl, addressEl, birthDateEl].forEach(el => {
        if (!el) return;
        if (flag) el.setAttribute('readonly', 'readonly');
        else el.removeAttribute('readonly');
      });
      // Tombol
      submitBtn.classList.toggle('d-none', flag);
      goProfileBtn.classList.toggle('d-none', !flag);
      alreadyBox.classList.toggle('d-none', !flag);
    };

    const fillForm = (reg) => {
      if (!reg) return;
      // Basic fields
      if (reg.full_name) fullNameEl.value = reg.full_name;
      if (reg.tiktok_username) usernameEl.value = reg.tiktok_username;
      if (reg.phone) phoneEl.value = reg.phone;
      if (reg.address) addressEl.value = reg.address;
      if (reg.birth_date) birthDateEl.value = reg.birth_date;
      // Hidden
      if (reg.tiktok_user_id) tiktokIdEl.value = reg.tiktok_user_id;
      if (reg.profile_pic_url) {
        avatarUrlEl.value = reg.profile_pic_url;
        avatarImg.src = reg.profile_pic_url;
        avatarWrap.classList.remove('d-none');
      }
    };

    // --- Campaign dari query ---
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

      // Link connect bawa campaign
      const qs = new URLSearchParams();
      if (cId)   qs.set('campaign_id', cId);
      if (cSlug) qs.set('campaign', cSlug);
      connectBtn.href = `/auth/tiktok/redirect${qs.toString() ? '?' + qs.toString() : ''}`;
      // pastikan bukan SPA
      connectBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.assign(connectBtn.href);
      });
    })();

    // Prefill dari session TikTok
    let sessionTikTok = {};
    try {
      const res = await fetch('/me/tiktok', { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' });
      if (res.ok) sessionTikTok = await res.json();
    } catch (e) {}

    if (sessionTikTok?.tiktok_user_id) tiktokIdEl.value = sessionTikTok.tiktok_user_id;
    if (sessionTikTok?.tiktok_full_name && !fullNameEl.value) fullNameEl.value = sessionTikTok.tiktok_full_name;
    if (sessionTikTok?.tiktok_avatar_url) {
      avatarUrlEl.value = sessionTikTok.tiktok_avatar_url;
      avatarImg.src = sessionTikTok.tiktok_avatar_url;
      avatarWrap.classList.remove('d-none');
    } else {
      connectBox.classList.remove('d-none');
    }

    // === CEK: sudah terdaftar belum? ===
    async function checkAlreadyRegistered() {
      const openId = tiktokIdEl.value?.trim();
      const cId = campaignIdEl.value?.trim();
      const cSlug = campaignSlugEl.value?.trim();

      if (!openId) return; // tanpa tiktok_user_id, skip

      const q = new URLSearchParams({ tiktok_user_id: openId });
      if (cId) q.set('campaign_id', cId);
      if (cSlug) q.set('campaign', cSlug);

      try {
        const res = await fetch(`/api/influencer-registrations/check?${q.toString()}`, {
          headers: { 'Accept': 'application/json' },
          credentials: 'same-origin'
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data.exists) {
          // populate & lock
          fillForm(data.data);
          setReadonly(true);
          // kalau avatar belum dari session tapi ada di DB
          if (!avatarUrlEl.value && data.data?.profile_pic_url) {
            avatarUrlEl.value = data.data.profile_pic_url;
            avatarImg.src = data.data.profile_pic_url;
            avatarWrap.classList.remove('d-none');
          }
        } else {
          setReadonly(false);
        }
      } catch (e) {
        // ignore
      }
    }

    await checkAlreadyRegistered();

    // Submit
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

        // sukses → ke profil
        showToast(resp.message || 'Registrasi berhasil disimpan.', 'success');
        const next = '/my-profile';
        if (location.pathname !== next) {
          history.pushState(null, '', next);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
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
  })
  .catch((err) => {
    console.error('[register] Failed to import modules', err);
  });
}
