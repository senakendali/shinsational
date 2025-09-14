// /js/pages/admin/roles/form.js
export async function render(target, params = {}, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();
  const isEdit = !!params.id;
  const title = isEdit ? 'Edit Role' : 'Tambah Role';

  const [
    { renderHeader },
    { renderBreadcrumb },
    loaderMod,
    { showToast },
    formMod,
    { roleService },
    { permissionService },
  ] = await Promise.all([
    import(`../../components/header.js?v=${v}`),
    import(`../../components/breadcrumb.js?v=${v}`),
    import(`../../components/loader.js?v=${v}`),
    import(`../../utils/toast.js?v=${v}`),
    import(`../../utils/form.js?v=${v}`),
    import(`../../services/roleService.js?v=${v}`),
    import(`../../services/permissionService.js?v=${v}`),
  ]);

  const { showLoader, hideLoader } = loaderMod;
  const { formGroup, showValidationErrors, clearAllErrors } = formMod;

  target.innerHTML = '';
  showLoader();
  renderHeader('header');
  renderBreadcrumb(
    target,
    isEdit ? `/roles/${params.id}/edit` : '/roles/create',
    labelOverride || title
  );

  // Markup
  target.innerHTML += `
    <form id="role-form" class="bg-white p-4 rounded shadow-sm">
      ${formGroup('name', 'Nama Role', 'text')}
      <div class="mb-3">
        <label for="guard_name" class="form-label">Guard Name</label>
        <select id="guard_name" name="guard_name" class="form-select">
          <option value="web">web</option>
          <option value="api">api</option>
        </select>
        <div class="invalid-feedback d-block" data-error-for="guard_name"></div>
      </div>

      <div class="mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <label class="form-label mb-0">Permissions</label>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-sm btn-outline-secondary" id="permSelectAll">Select all</button>
            <button type="button" class="btn btn-sm btn-outline-secondary" id="permClear">Clear</button>
          </div>
        </div>
        <input id="permSearch" class="form-control mb-2" placeholder="Cari permission…">
        <div id="permList" class="border rounded p-2" style="max-height: 300px; overflow: auto">
          <div class="text-muted small">Loading permissions…</div>
        </div>
        <div class="invalid-feedback d-block" id="error-permissions"></div>
      </div>

      <div class="d-flex gap-2 justify-content-end mt-4">
        <button type="button" class="btn btn-secondary" id="cancelBtn"><i class="bi bi-x-square"></i> Batal</button>
        <button type="submit" class="btn btn-primary"><i class="bi bi-save"></i> Simpan</button>
      </div>
    </form>
  `;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  $('#cancelBtn')?.addEventListener('click', () => {
    history.pushState(null, '', '/admin/roles');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  // State
  let allPerms = [];
  let roleData = null;

  // Render permission list (dengan filter & pre-checked dari roleData)
  const renderPerms = (filter = '') => {
    const wrap = $('#permList');
    const q = filter.trim().toLowerCase();
    const rows = allPerms
      .filter(p => !q || p.name.toLowerCase().includes(q))
      .map(p => {
        const checked = !!roleData?.permissions?.some(rp => rp.name === p.name);
        const id = `perm-${(p.id ?? p.name).toString().replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        return `
          <div class="form-check">
            <input class="form-check-input perm-check" type="checkbox" id="${id}" data-name="${p.name}" ${checked ? 'checked' : ''}>
            <label class="form-check-label" for="${id}">${p.name}</label>
          </div>
        `;
      }).join('');
    wrap.innerHTML = rows || `<div class="text-muted small">Tidak ada permission.</div>`;
  };

  // Helpers: load permissions by guard
  async function fetchPermissionsByGuard(guard) {
    const permRes = await permissionService.getAll({ per_page: 500, guard });
    allPerms = (permRes?.data || permRes || []).map(p => ({
      id: p.id ?? p.name,
      name: p.name,
      guard_name: p.guard_name || 'web',
    }));
  }

  // Init data
  try {
    const guardEl = $('#guard_name');
    const nameEl = $('#name');

    if (isEdit) {
      // 1) Ambil role (dengan permissions)
      const roleRes = await roleService.get(params.id, { include: 'permissions' });
      roleData = {
        id: roleRes.id,
        name: roleRes.name,
        guard_name: roleRes.guard_name || 'web',
        permissions: (roleRes.permissions || []).map(p => ({ name: p.name })),
      };

      // Prefill fields
      if (nameEl) nameEl.value = roleData.name || '';
      if (guardEl) guardEl.value = roleData.guard_name || 'web';

      // 2) Load permissions sesuai guard role
      await fetchPermissionsByGuard(roleData.guard_name);
    } else {
      // Create: default guard = 'web'
      if (guardEl) guardEl.value = 'web';
      await fetchPermissionsByGuard('web');
    }

    renderPerms('');
  } catch (e) {
    $('#permList').innerHTML = `<div class="text-danger small">Gagal memuat permissions.</div>`;
  } finally {
    hideLoader();
  }

  // Toolbar permissions
  $('#permSelectAll')?.addEventListener('click', () => {
    $$('.perm-check').forEach(cb => (cb.checked = true));
  });
  $('#permClear')?.addEventListener('click', () => {
    $$('.perm-check').forEach(cb => (cb.checked = false));
  });
  $('#permSearch')?.addEventListener('input', (e) => {
    renderPerms(e.target.value);
  });

  // Jika guard diubah → reload list permission sesuai guard baru & reset pilihan
  $('#guard_name')?.addEventListener('change', async (e) => {
    const newGuard = (e.target.value || 'web').trim();
    showLoader();
    try {
      await fetchPermissionsByGuard(newGuard);
      // Saat ganti guard, jangan otomatis pre-check dari role lama
      // kecuali memang ada permissions dengan nama yang sama di guard tsb
      // roleData tetap dipakai untuk cek nama → aman.
      renderPerms($('#permSearch')?.value || '');
    } finally {
      hideLoader();
    }
  });

  // Submit
  $('#role-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();

    const fd = new FormData();
    const name = ($('#name')?.value || '').trim();
    const guard = ($('#guard_name')?.value || 'web').trim();

    if (name) fd.set('name', name);
    if (guard) fd.set('guard_name', guard);

    // Kumpulkan permissions sebagai array
    const selected = Array.from($$('.perm-check:checked'))
      .map(cb => cb.getAttribute('data-name'))
      .filter(Boolean);

    // Kirim sebagai permissions[]
    selected.forEach(n => fd.append('permissions[]', n));

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    showLoader();

    try {
      if (isEdit) {
        await roleService.update(params.id, fd);
        showToast('Role berhasil diperbarui');
      } else {
        await roleService.create(fd);
        showToast('Role berhasil ditambahkan');
      }

      history.pushState(null, '', '/admin/roles');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      if (err?.errors) {
        showValidationErrors(err.errors);
        if (err.errors.permissions) {
          const el = document.getElementById('error-permissions');
          el.textContent = Array.isArray(err.errors.permissions)
            ? err.errors.permissions[0]
            : String(err.errors.permissions);
        }
      }
      showToast(err?.message || 'Gagal menyimpan role.', 'error');
    } finally {
      hideLoader();
      submitBtn.disabled = false;
    }
  });
}
