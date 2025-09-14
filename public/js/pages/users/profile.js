// /js/pages/admin/profile.js
export async function render(target, params = {}, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();
  const title = 'My Profile';

  const [
    { renderHeader },
    { renderBreadcrumb },
    loaderMod,
    { showToast },
    formMod,
    { meService },
  ] = await Promise.all([
    import(`../../components/header.js?v=${v}`),
    import(`../../components/breadcrumb.js?v=${v}`),
    import(`../../components/loader.js?v=${v}`),
    import(`../../utils/toast.js?v=${v}`),
    import(`../../utils/form.js?v=${v}`),
    import(`../../services/meService.js?v=${v}`),
  ]);

  const { showLoader, hideLoader } = loaderMod;
  const { formGroup, showValidationErrors, clearAllErrors } = formMod;

  // helpers
  const $ = (s) => document.querySelector(s);
  const initials = (name = '') => {
    const parts = String(name).trim().split(/\s+/).slice(0,2);
    return parts.map(p => p[0]?.toUpperCase() || '').join('') || 'U';
  };
  const avatarFallbackSvg = (name) => {
    const ini = initials(name);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
        <rect width="100%" height="100%" fill="#e9ecef"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
              font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial"
              font-size="56" fill="#6c757d">${ini}</text>
      </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  };

  // PATCH: resolver avatar yang robust (avatar_url > avatar_path > nested.user.*)
  function resolveAvatarUrl(meObj) {
    const direct =
      meObj?.avatar_url ||
      (meObj?.avatar_path ? (`/files?p=${encodeURIComponent(meObj.avatar_path)}`) : null);

    const nested =
      meObj?.user?.avatar_url ||
      (meObj?.user?.avatar_path ? (`/files?p=${encodeURIComponent(meObj.user.avatar_path)}`) : null);

    return direct || nested || null;
  }

  target.innerHTML = '';
  showLoader();
  renderHeader('header');
  renderBreadcrumb(target, '/admin/profile', labelOverride || title);

  target.innerHTML += `
    <div class="row g-3">
      <!-- Profile info -->
      <div class="col-lg-8">
        <form id="profileForm" class="bg-white p-4 rounded shadow-sm">
          <h5 class="mb-3">Informasi Akun</h5>
          <div class="row g-3">
            <div class="col-md-6">
              ${formGroup('name', 'Nama Lengkap', 'text')}
            </div>
            <div class="col-md-6">
              ${formGroup('email', 'Email', 'email')}
            </div>
          </div>

          <div class="d-flex gap-2 justify-content-end mt-4">
            <button type="submit" class="btn btn-primary">
              <i class="bi bi-save"></i> Simpan Perubahan
            </button>
          </div>
        </form>

        <form id="passwordForm" class="bg-white p-4 rounded shadow-sm mt-3">
          <h5 class="mb-3">Ubah Password</h5>
          <div class="row g-3">
            <div class="col-md-6">
              ${formGroup('current_password', 'Password Saat Ini', 'password')}
            </div>
            <div class="col-md-6"></div>
            <div class="col-md-6">
              ${formGroup('password', 'Password Baru', 'password')}
            </div>
            <div class="col-md-6">
              ${formGroup('password_confirmation', 'Konfirmasi Password Baru', 'password')}
            </div>
          </div>

          <div class="d-flex gap-2 justify-content-end mt-4">
            <button type="submit" class="btn btn-outline-primary">
              <i class="bi bi-key"></i> Ganti Password
            </button>
          </div>
        </form>
      </div>

      <!-- Avatar -->
      <div class="col-lg-4">
        <div class="bg-white p-4 rounded shadow-sm h-100">
          <h5 class="mb-3">Foto Profil</h5>
          <div class="d-flex flex-column align-items-center text-center">
            <img id="avatarPreview" src="" alt="Avatar" class="rounded-circle border"
                 style="width:160px;height:160px;object-fit:cover;background:#f8f9fa">
            <input type="file" id="avatarInput" class="d-none" accept="image/*">
            <div class="d-flex gap-2 mt-3">
              <button type="button" id="changeAvatarBtn" class="btn btn-outline-secondary">
                <i class="bi bi-image"></i> Ganti Foto
              </button>
              <button type="button" id="uploadAvatarBtn" class="btn btn-primary" disabled>
                <i class="bi bi-upload"></i> Upload
              </button>
            </div>
            <div class="text-muted small mt-2">Format: JPG/PNG. Maks ~2MB.</div>
          </div>
        </div>
      </div>
    </div>
  `;

  let me = null;
  let pendingAvatarFile = null;

  // init data
  try {
    me = await meService.get();
    const name  = me?.name || me?.user?.name || '';
    const email = me?.email || me?.user?.email || '';

    const fill = (id, val) => { const el = $('#'+id); if (el) el.value = val ?? ''; };
    fill('name', name);
    fill('email', email);

    // PATCH: pakai resolver
    const avatarUrl = resolveAvatarUrl(me);
    const avatarEl = $('#avatarPreview');
    if (avatarUrl) {
      avatarEl.src = `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
    } else {
      avatarEl.src = avatarFallbackSvg(name || email);
    }
  } catch (e) {
    const avatarEl = $('#avatarPreview');
    avatarEl.src = avatarFallbackSvg('User');
  } finally {
    hideLoader();
  }

  // Avatar handlers
  $('#changeAvatarBtn')?.addEventListener('click', () => {
    $('#avatarInput')?.click();
  });

  $('#avatarInput')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    pendingAvatarFile = file;
    const url = URL.createObjectURL(file);
    $('#avatarPreview').src = url;
    $('#uploadAvatarBtn').disabled = false;
  });

  $('#uploadAvatarBtn')?.addEventListener('click', async () => {
    if (!pendingAvatarFile) return;
    const btn = $('#uploadAvatarBtn');
    btn.disabled = true;
    showLoader();
    try {
      const fd = new FormData();
      fd.set('avatar', pendingAvatarFile);
      const resp = await meService.updateAvatar(fd);

      // PATCH: ambil url baru (avatar_url > avatar_path)
      const newUrl =
        resp?.avatar_url ||
        resp?.data?.avatar_url ||
        (resp?.data?.avatar_path ? `/files?p=${encodeURIComponent(resp.data.avatar_path)}` : null);

      if (newUrl) {
        $('#avatarPreview').src = `${newUrl}${newUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
      }

      // refresh navbar (nama/foto)
      try {
        window.__ME = await meService.get(); // refresh cache
        const { renderNavbar } = await import(`../../components/navbar.js?v=${v}`);
        await renderNavbar('#navbar-menu');
      } catch {}
      showToast('Foto profil berhasil diperbarui');
      pendingAvatarFile = null;
    } catch (err) {
      showToast(err?.message || 'Gagal mengunggah foto.', 'error');
    } finally {
      hideLoader();
      btn.disabled = !pendingAvatarFile;
    }
  });

  // Profile submit
  $('#profileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();
    showLoader();

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;

    try {
      const name  = ($('#name')?.value || '').trim();
      const email = ($('#email')?.value || '').trim();
      const payload = new FormData();
      if (name)  payload.set('name', name);
      if (email) payload.set('email', email);

      const resp = await meService.updateProfile(payload);

      // refresh cache & navbar
      window.__ME = resp?.data || await meService.get();
      try {
        const { renderNavbar } = await import(`../../components/navbar.js?v=${v}`);
        await renderNavbar('#navbar-menu');
      } catch {}

      showToast('Profil berhasil diperbarui');
    } catch (err) {
      if (err?.errors) showValidationErrors(err.errors);
      showToast(err?.message || 'Gagal memperbarui profil.', 'error');
    } finally {
      hideLoader();
      btn.disabled = false;
    }
  });

  // Password submit
  $('#passwordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();
    showLoader();

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;

    try {
      const fd = new FormData(e.target);
      await meService.updatePassword(fd);

      // bersihkan input password
      ['current_password','password','password_confirmation'].forEach(id => {
        const el = $('#'+id);
        if (el) el.value = '';
      });

      showToast('Password berhasil diganti');
    } catch (err) {
      if (err?.errors) showValidationErrors(err.errors);
      showToast(err?.message || 'Gagal mengganti password.', 'error');
    } finally {
      hideLoader();
      btn.disabled = false;
    }
  });
}
