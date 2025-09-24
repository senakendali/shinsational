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
    { brandService },
  ] = await Promise.all([
    import(`../../components/header.js?v=${v}`),
    import(`../../components/breadcrumb.js?v=${v}`),
    import(`../../components/loader.js?v=${v}`),
    import(`../../utils/toast.js?v=${v}`),
    import(`../../utils/form.js?v=${v}`),
    import(`../../services/userService.js?v=${v}`),
    import(`../../services/roleService.js?v=${v}`),
    import(`../../services/brandService.js?v=${v}`),
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
        <!-- Role + Brands (same column width) -->
        <div class="col-md-6">
          <label for="roleSelect" class="form-label">Role</label>
          <select id="roleSelect" class="form-select">
            <option value="">— Pilih role —</option>
          </select>
          <div class="invalid-feedback d-block" id="error-role"></div>

          <!-- Brand selector tepat di bawah Role -->
          <div class="mt-3 d-none" id="brandSelectWrap">
            <label for="brandSelect" class="form-label">
              Brands <span class="text-danger">*</span>
              <span id="brandSelectedCount" class="badge bg-light text-dark ms-1 align-middle d-none"></span>
            </label>
            <select id="brandSelect" class="form-select" multiple size="8" aria-describedby="brandHelp">
              <!-- options injected -->
            </select>
            <div class="invalid-feedback d-block" id="error-brand"></div>
            <div id="brandHelp" class="text-muted small mt-1">
              Wajib diisi jika role adalah <strong>Brand / Brand Admin / Brand Super Admin / Brand Owner</strong>.
              Kamu bisa memilih lebih dari satu brand (Ctrl/Cmd + klik atau drag).
            </div>
            <div id="brandChips" class="mt-2 d-flex flex-wrap gap-2"></div>
          </div>
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
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  $('#cancelBtn')?.addEventListener('click', () => {
    history.pushState(null, '', '/admin/users');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  // ===== State
  let allRoles = [];              // [{id, name}]
  let allBrands = [];             // [{id, name}]
  let userData = null;            // {roles:[{name}], permissions:[{name}], brand_ids?:[], brands?:[]}
  let rolePerms = [];             // permissions [{id?, name}]
  let selectedBrandIds = new Set();

  // Role keluarga Brand
  const BRANDISH_NAMES = ['brand','brand admin','brand super admin','brand owner'];

  function isBrandishRoleName(name) {
    const n = String(name || '').toLowerCase();
    return BRANDISH_NAMES.includes(n);
  }
  function roleIdIsBrandish(rid) {
    const r = allRoles.find(x => String(x.id) === String(rid));
    return r ? isBrandishRoleName(r.name) : false;
  }
  function toggleBrandSelect(show) {
    const wrap = $('#brandSelectWrap');
    if (!wrap) return;
    wrap.classList.toggle('d-none', !show);
  }
  function renderRolePerms(filter = '') {
    const wrap = $('#rolePermList');
    const q = filter.trim().toLowerCase();

    const roleList = rolePerms
      .filter(p => !q || p.name.toLowerCase().includes(q))
      .map(p => `<div class="form-check disabled">
        <input class="form-check-input" type="checkbox" disabled checked>
        <label class="form-check-label">${p.name}</label>
      </div>`).join('');

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

  function setBrandSelectedState(ids = []) {
    selectedBrandIds = new Set(ids.map(String));
    // chips
    const chips = $('#brandChips');
    const list = allBrands.filter(b => selectedBrandIds.has(String(b.id)));
    chips.innerHTML = list.map(b => `
      <span class="badge rounded-pill bg-secondary">
        ${b.name}
        <button type="button" class="btn-close btn-close-white btn-sm ms-1" data-remove-brand="${b.id}" aria-label="Remove"></button>
      </span>
    `).join('') || '';
    // count
    const count = $('#brandSelectedCount');
    if (selectedBrandIds.size) {
      count.textContent = `${selectedBrandIds.size} selected`;
      count.classList.remove('d-none');
    } else {
      count.textContent = '';
      count.classList.add('d-none');
    }
  }

  function syncMultiSelectFromState() {
    const sel = $('#brandSelect');
    if (!sel) return;
    $$('#brandSelect option').forEach(opt => {
      opt.selected = selectedBrandIds.has(String(opt.value));
    });
  }

  // ===== Init
  try {
    const [roleRes, userRes, brandRes] = await Promise.all([
      roleService.getAll({ per_page: 500 }),
      // include brands (array) + fallback brand tunggal
      isEdit ? userService.get(params.id, { include: 'roles,permissions,brands,brand' }) : Promise.resolve(null),
      brandService.getAll({ per_page: 500, status: '' }),
    ]);

    allRoles = (roleRes?.data || roleRes || []).map(r => ({ id: r.id ?? r.name, name: r.name }));
    allBrands = (brandRes?.data || brandRes || []).map(b => ({ id: b.id, name: b.name || `Brand ${b.id}` }));

    // Prefill fields
    if (userRes) {
      const brandIdsFromArray = Array.isArray(userRes.brands)
        ? userRes.brands.map(b => String(b.id))
        : [];
      const singleFallback = userRes.brand?.id ?? userRes.brand_id ?? userRes.brandId ?? null;

      userData = {
        id: userRes.id,
        name: userRes.name || '',
        email: userRes.email || '',
        roles: (userRes.roles || []).map(r => ({ name: r.name })),
        permissions: (userRes.permissions || []).map(p => ({ name: p.name })),
        brand_ids: brandIdsFromArray.length ? brandIdsFromArray : (singleFallback ? [String(singleFallback)] : []),
      };
      const fill = (id, val) => { const el = $('#'+id); if (el) el.value = val ?? ''; };
      fill('name', userData.name);
      fill('email', userData.email);
    }

    // Role select
    const roleSelect = $('#roleSelect');
    roleSelect.innerHTML = `<option value="">— Pilih role —</option>` +
      allRoles.map(r => `<option value="${r.id}">${r.name}</option>`).join('');

    // Brand select
    const brandSelect = $('#brandSelect');
    brandSelect.innerHTML = allBrands.map(b => `<option value="${b.id}">${b.name}</option>`).join('');

    // Prefill selected role & permissions
    if (userData?.roles?.length) {
      const currentName = userData.roles[0].name;
      const current = allRoles.find(r => r.name === currentName);
      if (current) {
        roleSelect.value = String(current.id);
        await fetchRolePermsByRoleId(current.id);

        // Toggle brand selector jika keluarga Brand
        const showBrand = isBrandishRoleName(current.name);
        toggleBrandSelect(showBrand);

        // Prefill multi brand kalau ada
        if (showBrand && userData.brand_ids?.length) {
          setBrandSelectedState(userData.brand_ids);
          syncMultiSelectFromState();
        }
      }
    } else {
      renderRolePerms('');
      toggleBrandSelect(false);
    }

    // Filter permissions viewer
    $('#permSearch')?.addEventListener('input', (e) => {
      renderRolePerms(e.target.value);
    });

    // Ganti role → refresh permissions viewer & toggle brand selector
    roleSelect?.addEventListener('change', async (e) => {
      const chosenId = e.target.value ? Number(e.target.value) : null;
      await fetchRolePermsByRoleId(chosenId);
      const showBrand = roleIdIsBrandish(chosenId);
      toggleBrandSelect(showBrand);
      if (!showBrand) {
        setBrandSelectedState([]);
        syncMultiSelectFromState();
      }
      const errEl = $('#error-brand'); if (errEl) errEl.textContent = '';
    });

    // Interaksi multi-select brand
    brandSelect?.addEventListener('change', () => {
      const ids = Array.from(brandSelect.selectedOptions).map(o => String(o.value));
      setBrandSelectedState(ids);
    });

    // Remove chip
    $('#brandChips')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-brand]');
      if (!btn) return;
      const id = String(btn.getAttribute('data-remove-brand'));
      selectedBrandIds.delete(id);
      setBrandSelectedState(Array.from(selectedBrandIds));
      syncMultiSelectFromState();
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

    // single role → kirim nama (bukan id), kompatibel resolver by name
    let chosenRoleName = null;
    if (roleId) {
      const r = (allRoles.find(x => String(x.id) === String(roleId)));
      if (r) {
        chosenRoleName = r.name;
        fd.set('role', r.name);
      }
    }

    // Validasi brand kalau role keluarga Brand
    const isBrandish = !!(chosenRoleName && isBrandishRoleName(chosenRoleName));
    if (isBrandish) {
      const ids = Array.from(selectedBrandIds);
      if (!ids.length) {
        const el = document.getElementById('error-brand');
        if (el) el.textContent = 'Minimal pilih 1 brand untuk role keluarga Brand.';
        showToast('Pilih minimal 1 brand.', 'error');
        return;
      }
      // Backward-compat: kirim brand_id pertama + brand_ids[]
      fd.set('brand_id', ids[0]); // fallback optional
      ids.forEach(id => fd.append('brand_ids[]', id));
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
        const brandMsg = err.errors.brand_ids || err.errors['brand_ids.0'] || err.errors.brand_id || err.errors.brand;
        if (brandMsg) {
          const el = document.getElementById('error-brand');
          el.textContent = Array.isArray(brandMsg) ? brandMsg[0] : String(brandMsg);
        }
      }
      showToast(err?.message || 'Gagal menyimpan user.', 'error');
    } finally {
      hideLoader();
      submitBtn.disabled = false;
    }
  });
}
