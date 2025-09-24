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

  target.innerHTML = '';
  showLoader();
  renderHeader('header');
  renderBreadcrumb(target, '/admin/profile', labelOverride || title);

  // ===== Markup
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

      <!-- Roles & Permissions (replace avatar) -->
      <div class="col-lg-4">
        <div class="bg-white p-4 rounded shadow-sm h-100">
          <h5 class="mb-3">Roles & Permissions</h5>

          <div class="mb-2">
            <div class="text-muted small mb-1">Roles:</div>
            <div id="roleBadges" class="d-flex flex-wrap gap-1"></div>
          </div>

          <div class="d-flex align-items-center justify-content-between mb-2">
            <div class="text-muted small">Permissions:</div>
            <span id="permCount" class="badge bg-light text-dark">0</span>
          </div>

          <input id="permSearch" class="form-control mb-2" placeholder="Cari permission…">
          <div id="permList" class="border rounded p-2" style="max-height: 320px; overflow: auto">
            <div class="text-muted small">Memuat…</div>
          </div>
         
        </div>
      </div>
    </div>
  `;

  // ===== State
  let me = null;
  let abilities = []; // array of strings
  let roles = [];     // array of strings

  function renderRoleBadges(list = []) {
    const wrap = $('#roleBadges');
    if (!wrap) return;
    if (!list.length) {
      wrap.innerHTML = `<span class="badge bg-light text-dark">—</span>`;
      return;
    }
    wrap.innerHTML = list.map(n => `<span class="badge bg-light text-dark">${n}</span>`).join('');
  }

  function renderPermList(filter = '') {
    const wrap = $('#permList');
    const countEl = $('#permCount');
    const q = String(filter).trim().toLowerCase();

    const filtered = abilities
      .filter(p => !q || p.toLowerCase().includes(q))
      .sort((a, b) => a.localeCompare(b));

    countEl.textContent = String(filtered.length);

    if (!filtered.length) {
      wrap.innerHTML = `<div class="text-muted small">Tidak ada permission${q ? ' yang cocok' : ''}.</div>`;
      return;
    }

    wrap.innerHTML = filtered.map(name => `
      <div class="form-check disabled">
        <input class="form-check-input" type="checkbox" disabled checked>
        <label class="form-check-label">${name}</label>
      </div>
    `).join('');
  }

  // ===== Init data
  try {
    me = await meService.get(); // endpoint /api/me (roles, role, abilities sudah ada)
    const name  = me?.name || '';
    const email = me?.email || '';

    // fill profile fields
    const fill = (id, val) => { const el = $('#'+id); if (el) el.value = val ?? ''; };
    fill('name', name);
    fill('email', email);

    // roles & abilities from /api/me
    roles = Array.isArray(me.roles) && me.roles.length
      ? me.roles
      : (me.role ? [me.role] : []);

    abilities = Array.isArray(me.abilities) ? me.abilities : [];

    renderRoleBadges(roles);
    renderPermList('');
  } catch (e) {
    renderRoleBadges([]);
    abilities = [];
    renderPermList('');
  } finally {
    hideLoader();
  }

  // ===== Events
  $('#permSearch')?.addEventListener('input', (e) => {
    renderPermList(e.target.value);
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

      // refresh header/nav cache kalau ada
      window.__ME = resp?.data || await meService.get();
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
