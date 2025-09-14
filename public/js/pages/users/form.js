// /js/pages/admin/users/form.js
export async function render(target, params = {}, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();
  const isEdit = !!params.id;
  const title = isEdit ? 'Edit User' : 'Tambah User';

  const [
    { renderHeader },
    { renderBreadcrumb },
    loaderMod,
    { showToast },
    formMod,
    { userService },
    { roleService },
  ] = await Promise.all([
    import(`../../components/header.js?v=${v}`),
    import(`../../components/breadcrumb.js?v=${v}`),
    import(`../../components/loader.js?v=${v}`),
    import(`../../utils/toast.js?v=${v}`),
    import(`../../utils/form.js?v=${v}`),
    import(`../../services/userService.js?v=${v}`),
    import(`../../services/roleService.js?v=${v}`),
  ]);

  const { showLoader, hideLoader } = loaderMod;
  const { formGroup, showValidationErrors, clearAllErrors } = formMod;

  target.innerHTML = '';
  showLoader();
  renderHeader('header');
  renderBreadcrumb(
    target,
    isEdit ? `/admin/users/${params.id}/edit` : '/admin/users/create',
    labelOverride || title
  );

  // ===== Markup
  target.innerHTML += `
    <form id="user-form" class="bg-white p-4 rounded shadow-sm">
      <div class="row g-3">
        <div class="col-md-6">
          ${formGroup('name', 'Nama', 'text')}
        </div>
        <div class="col-md-6">
          ${formGroup('email', 'Email', 'email')}
        </div>
      </div>

      <div class="row g-3 mt-1">
        <div class="col-md-6">
          ${formGroup('password', 'Password', 'password')}
        </div>
        <div class="col-md-6">
          ${formGroup('password_confirmation', 'Konfirmasi Password', 'password')}
        </div>
      </div>
      <div class="text-muted small mb-3">
        ${isEdit ? 'Kosongkan password bila tidak ingin mengubah.' : 'Isi password dan konfirmasinya.'}
      </div>

      <div class="row g-3">
        <!-- Single Role Select -->
        <div class="col-md-6">
          <label for="roleSelect" class="form-label">Role</label>
          <select id="roleSelect" class="form-select">
            <option value="">— Pilih role —</option>
          </select>
          <div class="invalid-feedback d-block" id="error-role"></div>
        </div>

        <!-- Permissions (READ-ONLY dari role) -->
        <div class="col-md-6">
          <label class="form-label mb-1">Permissions (otomatis dari role)</label>
          <input id="permSearch" class="form-control mb-2" placeholder="Filter permission…">
          <div id="rolePermList" class="border rounded p-2" style="max-height: 260px; overflow: auto">
            <div class="text-muted small">Pilih role untuk melihat permissions.</div>
          </div>
          <div class="text-muted small mt-2">
            Permission user mengikuti role. Pengaturan permission langsung di user tidak tersedia di sini.
          </div>
        </div>
      </div>

      <div class="d-flex gap-2 justify-content-end mt-4">
        <button type="button" class="btn btn-secondary" id="cancelBtn">
          <i class="bi bi-x-square"></i> Batal
        </button>
        <button type="submit" class="btn btn-primary">
          <i class="bi bi-save"></i> Simpan
        </button>
      </div>
    </form>
  `;

  // ===== Helpers
  const $  = (s) => document.querySelector(s);

  $('#cancelBtn')?.addEventListener('click', () => {
    history.pushState(null, '', '/admin/users');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  // ===== State
  let allRoles = [];            // [{id, name}]
  let userData = null;          // {roles:[{name}], permissions:[{name}]}
  let rolePerms = [];           // permissions dari role terpilih [{id?, name}]

  function renderRolePerms(filter = '') {
    const wrap = $('#rolePermList');
    const q = filter.trim().toLowerCase();

    // permissions dari role (utama)
    const roleList = rolePerms
      .filter(p => !q || p.name.toLowerCase().includes(q))
      .map(p => `<div class="form-check disabled">
        <input class="form-check-input" type="checkbox" disabled checked>
        <label class="form-check-label">${p.name}</label>
      </div>`).join('');

    // kalau ada legacy "direct permissions" di user (di luar role), tampilkan sekadar info
    const directExtras = (userData?.permissions || [])
      .filter(up => !rolePerms.some(rp => rp.name === up.name))
      .filter(p => !q || p.name.toLowerCase().includes(q));

    const directBlock = directExtras.length
      ? `<hr class="my-2">
         <div class="text-muted small mb-1">Direct permissions pada user (legacy):</div>
         ${directExtras.map(p => `<div class="form-check disabled">
            <input class="form-check-input" type="checkbox" disabled checked>
            <label class="form-check-label">${p.name}</label>
          </div>`).join('')}`
      : '';

    wrap.innerHTML = (roleList || (q ? '<div class="text-muted small">Tidak ada yang cocok.</div>' : '<div class="text-muted small">Role belum dipilih.</div>')) + directBlock;
  }

  async function fetchRolePermsByRoleId(roleId) {
    if (!roleId) {
      rolePerms = [];
      renderRolePerms($('#permSearch')?.value || '');
      return;
    }
    try {
      const role = await roleService.get(roleId, { include: 'permissions' });
      rolePerms = (role.permissions || []).map(p => ({ id: p.id ?? p.name, name: p.name }));
      renderRolePerms($('#permSearch')?.value || '');
    } catch {
      rolePerms = [];
      renderRolePerms($('#permSearch')?.value || '');
    }
  }

  // ===== Init
  try {
    const [roleRes, userRes] = await Promise.all([
      roleService.getAll({ per_page: 500 }),                             // daftar role
      isEdit ? userService.get(params.id, { include: 'roles,permissions' }) : Promise.resolve(null),
    ]);

    allRoles = (roleRes?.data || roleRes || []).map(r => ({ id: r.id ?? r.name, name: r.name }));
    userData = userRes ? {
      id: userRes.id,
      name: userRes.name || '',
      email: userRes.email || '',
      roles: (userRes.roles || []).map(r => ({ name: r.name })),
      permissions: (userRes.permissions || []).map(p => ({ name: p.name })),
    } : null;

    // Prefill fields
    if (userData) {
      const fill = (id, val) => { const el = $('#'+id); if (el) el.value = val ?? ''; };
      fill('name', userData.name);
      fill('email', userData.email);
    }

    // Render Role select
    const roleSelect = $('#roleSelect');
    roleSelect.innerHTML = `<option value="">— Pilih role —</option>` +
      allRoles.map(r => `<option value="${r.id}">${r.name}</option>`).join('');

    // Prefill selected role kalau edit
    if (userData?.roles?.length) {
      const currentName = userData.roles[0].name;
      const current = allRoles.find(r => r.name === currentName);
      if (current) {
        roleSelect.value = String(current.id);
        await fetchRolePermsByRoleId(current.id);
      }
    } else {
      renderRolePerms('');
    }

    // Filter viewer
    $('#permSearch')?.addEventListener('input', (e) => {
      renderRolePerms(e.target.value);
    });

    // Ganti role → refresh permissions viewer
    roleSelect?.addEventListener('change', async (e) => {
      const chosenId = e.target.value ? Number(e.target.value) : null;
      await fetchRolePermsByRoleId(chosenId);
    });
  } catch {
    $('#rolePermList').innerHTML = `<div class="text-danger small">Gagal memuat data.</div>`;
  } finally {
    hideLoader();
  }

  // ===== Submit
  document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();

    const fd = new FormData();
    const name  = ($('#name')?.value || '').trim();
    const email = ($('#email')?.value || '').trim();
    const pass  = ($('#password')?.value || '').trim();
    const pass2 = ($('#password_confirmation')?.value || '').trim();
    const roleId = ($('#roleSelect')?.value || '').trim();

    if (name) fd.set('name', name);
    if (email) fd.set('email', email);
    if (pass) fd.set('password', pass);
    if (pass2) fd.set('password_confirmation', pass2);

    // single role → kirim nama (bukan id), biar kompatibel resolver by name
    if (roleId) {
      const r = (allRoles.find(x => String(x.id) === String(roleId)));
      if (r) fd.set('role', r.name);
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    showLoader();

    try {
      if (isEdit) {
        await userService.update(params.id, fd);
        showToast('User berhasil diperbarui');
      } else {
        await userService.create(fd);
        showToast('User berhasil ditambahkan');
      }
      history.pushState(null, '', '/admin/users');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      if (err?.errors) {
        showValidationErrors(err.errors);
        if (err.errors.role) {
          const el = document.getElementById('error-role');
          el.textContent = Array.isArray(err.errors.role) ? err.errors.role[0] : String(err.errors.role);
        }
      }
      showToast(err?.message || 'Gagal menyimpan user.', 'error');
    } finally {
      hideLoader();
      submitBtn.disabled = false;
    }
  });
}
