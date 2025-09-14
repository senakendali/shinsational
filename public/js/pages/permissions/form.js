// /js/pages/admin/permissions/form.js
export async function render(target, params = {}, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();
  const isEdit = !!params.id;
  const title = isEdit ? 'Edit Permission' : 'Tambah Permission';

  const [
    { renderHeader },
    { renderBreadcrumb },
    { showToast },
    loaderMod,
    formMod,
    { permissionService }
  ] = await Promise.all([
    import(`../../components/header.js?v=${v}`),
    import(`../../components/breadcrumb.js?v=${v}`),
    import(`../../utils/toast.js?v=${v}`),
    import(`../../components/loader.js?v=${v}`),
    import(`../../utils/form.js?v=${v}`),
    import(`../../services/permissionService.js?v=${v}`)
  ]);

  const { showLoader, hideLoader } = loaderMod;
  const { formGroup, showValidationErrors, clearAllErrors } = formMod;

  target.innerHTML = '';
  showLoader();
  renderHeader('header');
  renderBreadcrumb(
    target,
    isEdit ? `/admin/permissions/${params.id}/edit` : '/admin/permissions/create',
    labelOverride || title
  );

  target.innerHTML += `
    <form id="perm-form" class="bg-white p-4 rounded shadow-sm">
      ${formGroup('name', 'Nama Permission', 'text')}
      ${formGroup('guard_name', 'Guard Name', 'text')}
      <div class="text-muted small mb-3">Biasanya gunakan <code>web</code> sebagai guard.</div>

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

  // Cancel → balik ke list
  document.getElementById('cancelBtn').addEventListener('click', () => {
    history.pushState(null, '', '/admin/permissions');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  // Prefill default
  const guardEl = document.getElementById('guard_name');
  if (guardEl && !isEdit) guardEl.value = 'web';

  // Submit
  document.getElementById('perm-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();
    clearAllErrors();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const name = (document.getElementById('name')?.value || '').trim();
    const guard_name = (document.getElementById('guard_name')?.value || '').trim() || 'web';

    const payload = { name, guard_name };

    try {
      if (isEdit) {
        await permissionService.update(params.id, payload);
        showToast('Permission berhasil diperbarui');
      } else {
        await permissionService.create(payload);
        showToast('Permission berhasil ditambahkan');
      }
      history.pushState(null, '', '/admin/permissions');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      showToast(err?.message || 'Gagal menyimpan permission.', 'error');
      if (err?.errors) showValidationErrors(err.errors);
    } finally {
      hideLoader();
      submitBtn.disabled = false;
    }
  });

  // Prefill saat edit
  if (isEdit) {
    try {
      const data = await permissionService.get(params.id);
      const fill = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val ?? '';
      };
      fill('name', data.name);
      fill('guard_name', data.guard_name || 'web');
    } catch (e) {
      showToast('Gagal mengambil data permission.', 'error');
    } finally {
      hideLoader();
    }
  } else {
    hideLoader();
  }
}
