export async function render(target, path, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();

  const [
    { renderHeader },
    { renderBreadcrumb },
    { showToast },
    loaderMod,
    { roleService },
  ] = await Promise.all([
    import(`../../components/header.js?v=${v}`),
    import(`../../components/breadcrumb.js?v=${v}`),
    import(`../../utils/toast.js?v=${v}`),
    import(`../../components/loader.js?v=${v}`),
    import(`../../services/roleService.js?v=${v}`),
  ]);

  const { showLoader, hideLoader } = loaderMod;

  target.innerHTML = '';
  showLoader();
  renderHeader('header');
  renderBreadcrumb(target, path, labelOverride || 'Roles');

  target.innerHTML += `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <input class="form-control w-50" type="search" placeholder="Cari role..." id="searchInput">
      <button class="btn btn-outline-primary" id="addNew">
        <i class="bi bi-plus-lg"></i> Tambah Role
      </button>
    </div>

    <div id="role-list"></div>

    <nav class="mt-3">
      <ul class="pagination" id="pagination"></ul>
    </nav>
  `;

  // Tambah → ke form create
  document.getElementById('addNew').addEventListener('click', () => {
    history.pushState(null, '', '/admin/roles/create');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  let currentPage = Number(query?.page || 1);
  let searchKeyword = String(query?.q || '');
  let searchTimeout = null;

  const $ = (s) => document.querySelector(s);

  async function loadRoles(keyword = '', page = 1) {
    showLoader();
    try {
      const res = await roleService.getAll({ q: keyword, page, per_page: 10 });
      const rows = (res?.data || []).map((role, i) => {
        const n = (page - 1) * (res?.per_page || 20) + i + 1;

        const guard = role.guard_name || 'web';
        const permCount = (role.permissions_count ?? (role.permissions?.length ?? 0));
        const userCount = (role.users_count ?? (role.users?.length ?? 0));

        const metaLine = `
          <div class="text-muted small">
            ${permCount} permission • ${userCount} user
          </div>
        `;

        return `
          <tr>
            <td>${n}</td>
            <td>
              <div class="fw-semibold">${role.name}</div>
              ${metaLine}
            </td>
            <td><code>${guard}</code></td>
            <td>
              <button class="btn btn-sm btn-outline-primary me-2 app-link"
                      data-href="/admin/roles/${role.id}/edit">
                <i class="bi bi-pencil"></i> Edit
              </button>
              <button class="btn btn-sm btn-outline-danger"
                      data-id="${role.id}" data-name="${role.name}"
                      onclick="confirmDeleteRole(this)">
                <i class="bi bi-trash"></i> Delete
              </button>
            </td>
          </tr>
        `;
      }).join('') || '<tr><td colspan="4" class="text-center text-muted">Tidak ada data</td></tr>';

      $('#role-list').innerHTML = `
        <table class="table table-bordered bg-white">
          <thead class="table-light">
            <tr><th colspan="4" class="text-uppercase">Roles</th></tr>
            <tr>
              <th style="width:72px">#</th>
              <th>Nama Role</th>
              <th style="width:140px">Guard</th>
              <th style="width:220px">Aksi</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;

      // Pagination
      const pagination = $('#pagination');
      pagination.innerHTML = '';
      const last = res?.last_page ?? 1;
      const cur  = res?.current_page ?? page;

      if (last <= 1) {
        pagination.style.display = 'none';
      } else {
        pagination.style.display = 'flex';
        for (let i = 1; i <= last; i++) {
          const li = document.createElement('li');
          li.className = `page-item ${i === cur ? 'active' : ''}`;
          li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
          li.addEventListener('click', (e) => {
            e.preventDefault();
            currentPage = i;
            // keep q in URL
            const sp = new URLSearchParams(location.search);
            if (searchKeyword) sp.set('q', searchKeyword); else sp.delete('q');
            sp.set('page', String(currentPage));
            history.replaceState(null, '', `${location.pathname}?${sp.toString()}`);
            loadRoles(searchKeyword, currentPage);
          });
          pagination.appendChild(li);
        }
      }

      // Edit via app-link
      document.querySelectorAll('.app-link').forEach(link => {
        link.addEventListener('click', e => {
          e.preventDefault();
          const href = link.getAttribute('data-href');
          history.pushState(null, '', href);
          window.dispatchEvent(new PopStateEvent('popstate'));
        });
      });

      // set search box value from state
      $('#searchInput').value = keyword;
    } catch (e) {
      $('#role-list').innerHTML = `<div class="text-danger">Gagal memuat data role.</div>`;
    } finally {
      hideLoader();
    }
  }

  // Search debounce + sync URL ?q=
  const searchEl = $('#searchInput');
  searchEl.addEventListener('input', (e) => {
    searchKeyword = e.target.value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      const sp = new URLSearchParams(location.search);
      if (searchKeyword) sp.set('q', searchKeyword); else sp.delete('q');
      sp.set('page', '1');
      history.replaceState(null, '', `${location.pathname}?${sp.toString()}`);
      loadRoles(searchKeyword, currentPage);
    }, 300);
  });

  // initial state from query
  await loadRoles(searchKeyword, currentPage);
}

// ====== Konfirmasi Hapus (global) → dynamic import di dalam fungsi ======
window.confirmDeleteRole = async function (btn) {
  const v = window.BUILD_VERSION || Date.now();
  const [{ roleService }, { showToast }] = await Promise.all([
    import(`../../services/roleService.js?v=${v}`),
    import(`../../utils/toast.js?v=${v}`)
  ]);

  const id = btn.getAttribute('data-id');
  const name = btn.getAttribute('data-name');

  let modalEl = document.getElementById('deleteModal');
  let modal;
  if (!modalEl) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="modal fade" id="deleteModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Konfirmasi Hapus</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <p id="delete-message">Yakin ingin menghapus item ini?</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
              <button type="button" class="btn btn-danger" id="confirmDeleteBtn">Hapus</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrapper);
    modalEl = document.getElementById('deleteModal');
  }

  modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modalEl.querySelector('#delete-message').textContent = `Yakin ingin menghapus role "${name}"?`;
  modal.show();

  const confirmBtn = document.getElementById('confirmDeleteBtn');
  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true;
    try {
      await roleService.delete(id);
      showToast('Role berhasil dihapus');
      modal.hide();
      // reload current page
      history.pushState(null, '', '/admin/roles');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      showToast(err?.message || 'Gagal menghapus role', 'error');
    } finally {
      confirmBtn.disabled = false;
    }
  };
};
