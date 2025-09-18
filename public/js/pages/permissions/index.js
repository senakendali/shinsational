// /js/pages/admin/permissions/index.js
export async function render(target, path, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();

  const [
    { renderHeader },
    { renderBreadcrumb },
    { showToast },
    loaderMod,
    { permissionService }
  ] = await Promise.all([
    import(`../../components/header.js?v=${v}`),
    import(`../../components/breadcrumb.js?v=${v}`),
    import(`../../utils/toast.js?v=${v}`),
    import(`../../components/loader.js?v=${v}`),
    import(`../../services/permissionService.js?v=${v}`)
  ]);

  const { showLoader, hideLoader } = loaderMod;

  target.innerHTML = '';
  showLoader();
  renderHeader("header");
  renderBreadcrumb(target, path, labelOverride || 'Permissions');

  target.innerHTML += `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <input class="form-control w-50" type="search" placeholder="Cari permission..." id="searchInput">
      <button class="btn btn-outline-primary" id="addNew">
        <i class="bi bi-plus-lg"></i> Tambah Permission
      </button>
    </div>

    <div id="perm-list"></div>

    <nav class="mt-3">
      <ul class="pagination" id="pagination"></ul>
    </nav>
  `;

  // Add New → form create
  document.getElementById('addNew').addEventListener('click', () => {
    history.pushState(null, '', '/admin/permissions/create');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  let currentPage = 1;
  let searchKeyword = '';
  let searchTimeout = null;

  function fmtDate(s) {
    if (!s) return '—';
    try { return new Date(s).toLocaleString('id-ID'); } catch { return s; }
  }

  async function loadPermissions(keyword = '', page = 1) {
    showLoader();
    try {
     const data = await permissionService.getAll({ q: keyword, page, per_page: 10 });

      // support both paginated and plain arrays
      const items = Array.isArray(data) ? data : (data.data || []);
      const perPage = data?.per_page ?? items.length;
      const rowsHtml = items.map((p, i) => {
        const n = (page - 1) * (perPage || 0) + i + 1;
        return `
          <tr>
            <td>${n}</td>
            <td><div class="fw-semibold">${p.name}</div></td>
            <td><code>${p.guard_name || 'web'}</code></td>
            <td>${fmtDate(p.created_at)}</td>
            <td>${fmtDate(p.updated_at)}</td>
            <td class="text-nowrap">
              <button class="btn btn-sm btn-outline-primary me-2 app-link" data-href="/admin/permissions/${p.id}/edit">
                <i class="bi bi-pencil"></i> Edit
              </button>
              <button class="btn btn-sm btn-outline-danger"
                      data-id="${p.id}" data-name="${p.name}"
                      onclick="confirmDeletePermission(this)">
                <i class="bi bi-trash"></i> Delete
              </button>
            </td>
          </tr>
        `;
      }).join('') || `<tr><td colspan="6" class="text-center text-muted">Tidak ada data</td></tr>`;

      document.getElementById('perm-list').innerHTML = `
        <table class="table table-bordered bg-white">
          <thead class="table-light">
            <tr><th colspan="6" class="text-uppercase">Permissions</th></tr>
            <tr>
              <th style="width:64px">#</th>
              <th>Nama</th>
              <th style="width:160px">Guard</th>
              <th style="width:180px">Dibuat</th>
              <th style="width:180px">Diubah</th>
              <th style="width:180px">Aksi</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      `;

      // pagination
      const pagination = document.getElementById('pagination');
      pagination.innerHTML = '';
      const lastPage = data?.last_page ?? 1;
      const cur = data?.current_page ?? page;

      if (lastPage <= 1) {
        pagination.style.display = 'none';
      } else {
        pagination.style.display = 'flex';
        for (let i = 1; i <= lastPage; i++) {
          const li = document.createElement('li');
          li.className = `page-item ${i === cur ? 'active' : ''}`;
          li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
          li.addEventListener('click', (e) => {
            e.preventDefault();
            currentPage = i;
            loadPermissions(searchKeyword, currentPage);
          });
          pagination.appendChild(li);
        }
      }

      // route to edit
      document.querySelectorAll('.app-link').forEach(link => {
        link.addEventListener('click', e => {
          e.preventDefault();
          const href = link.getAttribute('data-href');
          history.pushState(null, '', href);
          window.dispatchEvent(new PopStateEvent('popstate'));
        });
      });
    } catch (e) {
      document.getElementById('perm-list').innerHTML = `<div class="text-danger">Gagal memuat data permissions.</div>`;
    } finally {
      hideLoader();
    }
  }

  // search debounce
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchKeyword = e.target.value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      loadPermissions(searchKeyword, currentPage);
    }, 300);
  });

  loadPermissions(); // initial
}

// ====== Konfirmasi Hapus (global) ======
window.confirmDeletePermission = async function (btn) {
  const v = window.BUILD_VERSION || Date.now();
  const [{ permissionService }, { showToast }] = await Promise.all([
    import(`../../services/permissionService.js?v=${v}`),
    import(`../../utils/toast.js?v=${v}`)
  ]);

  const id = btn.getAttribute('data-id');
  const name = btn.getAttribute('data-name');

  let modalEl = document.getElementById('deletePermModal');
  if (!modalEl) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="modal fade" id="deletePermModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Konfirmasi Hapus</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <p id="delete-perm-msg">Yakin ingin menghapus permission ini?</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
              <button type="button" class="btn btn-danger" id="confirmDeletePermBtn">Hapus</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrapper);
    modalEl = document.getElementById('deletePermModal');
  }

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modalEl.querySelector('#delete-perm-msg').textContent = `Yakin ingin menghapus permission "${name}"?`;
  modal.show();

  const confirmBtn = document.getElementById('confirmDeletePermBtn');
  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true;
    try {
      await permissionService.delete(id);
      showToast('Permission berhasil dihapus');
      modal.hide();
      // re-render list
      history.pushState(null, '', '/admin/permissions');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      showToast(err?.message || 'Gagal menghapus permission', 'error');
    } finally {
      confirmBtn.disabled = false;
    }
  };
};
