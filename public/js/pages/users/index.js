// /js/pages/admin/users/index.js
export async function render(target, path, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();

  const [
    { renderHeader },
    { renderBreadcrumb },
    { showToast },
    loaderMod,
    { userService },
  ] = await Promise.all([
    import(`../../components/header.js?v=${v}`),
    import(`../../components/breadcrumb.js?v=${v}`),
    import(`../../utils/toast.js?v=${v}`),
    import(`../../components/loader.js?v=${v}`),
    import(`../../services/userService.js?v=${v}`),
  ]);

  const { showLoader, hideLoader } = loaderMod;

  target.innerHTML = '';
  showLoader();
  renderHeader('header');
  renderBreadcrumb(target, path, labelOverride || 'Users');

  target.innerHTML += `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <input class="form-control w-50" type="search" placeholder="Cari user (nama/email)..." id="searchInput">
      <button class="btn btn-outline-primary" id="addNew">
        <i class="bi bi-plus-lg"></i> Tambah User
      </button>
    </div>

    <div id="user-list"></div>

    <nav class="mt-3">
      <ul class="pagination" id="pagination"></ul>
    </nav>
  `;

  document.getElementById('addNew').addEventListener('click', () => {
    history.pushState(null, '', '/admin/users/create');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  const $ = (s) => document.querySelector(s);

  let currentPage = Number(query?.page || 1);
  let searchKeyword = String(query?.q || '');
  let searchTimeout = null;

  function fmtDate(s) {
    if (!s) return '—';
    try { return new Date(s).toLocaleString('id-ID'); } catch { return s; }
  }

  async function loadUsers(keyword = '', page = 1) {
    showLoader();
    try {
      // include roles+permissions; BE akan kirim roles[*].permissions_count dan user.permissions_count
      const res = await userService.getAll({ q: keyword, page, per_page: 20, include: 'roles,permissions' });

      const items = Array.isArray(res) ? res : (res.data || []);
      const perPage = res?.per_page ?? items.length;

      const rows = items.map((user, i) => {
        const n = (page - 1) * (perPage || 0) + i + 1;

        // single role name
        const roleName = user.roles?.[0]?.name || '—';

        // count permission dari role + direct (legacy)
        const rolePermCount = user.roles?.[0]?.permissions_count
          ?? (user.roles?.[0]?.permissions?.length ?? 0) // fallback kalau kamu ikut kirim roles.permissions
          ?? 0;
        const directPermCount = user.permissions_count ?? (user.permissions?.length ?? 0) ?? 0;
        const totalPerms = rolePermCount + directPermCount;

        const emailHtml = user.email ? `<div class="text-muted">${user.email}</div>` : '';

        return `
          <tr>
            <td>${n}</td>
            <td>
              <div class="fw-semibold">${user.name || '—'}</div>
              ${emailHtml}
            </td>
            <td style="width:200px">
              <span class="badge bg-light text-dark">${roleName}</span>
            </td>
            <td style="width:160px">
              ${totalPerms} permission
            </td>
            <td style="width:180px">${fmtDate(user.created_at)}</td>
            <td class="text-nowrap" style="width:220px">
              <button class="btn btn-sm btn-outline-primary me-2 app-link"
                      data-href="/admin/users/${user.id}/edit">
                <i class="bi bi-pencil"></i> Edit
              </button>
              <button class="btn btn-sm btn-outline-danger"
                      data-id="${user.id}" data-name="${user.name || user.email || 'User'}"
                      onclick="confirmDeleteUser(this)">
                <i class="bi bi-trash"></i> Delete
              </button>
            </td>
          </tr>
        `;
      }).join('') || `
        <tr><td colspan="6" class="text-center text-muted">Tidak ada data</td></tr>
      `;

      $('#user-list').innerHTML = `
        <table class="table table-bordered bg-white">
          <thead class="table-light">
            <tr><th colspan="6" class="text-uppercase">Users</th></tr>
            <tr>
              <th style="width:72px">#</th>
              <th>Nama / Email</th>
              <th style="width:200px">Role</th>
              <th style="width:160px">Permissions</th>
              <th style="width:180px">Dibuat</th>
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
            const sp = new URLSearchParams(location.search);
            if (searchKeyword) sp.set('q', searchKeyword); else sp.delete('q');
            sp.set('page', String(currentPage));
            history.replaceState(null, '', `${location.pathname}?${sp.toString()}`);
            loadUsers(searchKeyword, currentPage);
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

      $('#searchInput').value = keyword;
    } catch (e) {
      $('#user-list').innerHTML = `<div class="text-danger">Gagal memuat data user.</div>`;
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
      loadUsers(searchKeyword, currentPage);
    }, 300);
  });

  // initial
  await loadUsers(searchKeyword, currentPage);
}

// ====== Konfirmasi Hapus (global) ======
window.confirmDeleteUser = async function (btn) {
  const v = window.BUILD_VERSION || Date.now();
  const [{ userService }, { showToast }] = await Promise.all([
    import(`../../services/userService.js?v=${v}`),
    import(`../../utils/toast.js?v=${v}`)
  ]);

  const id = btn.getAttribute('data-id');
  const name = btn.getAttribute('data-name');

  let modalEl = document.getElementById('deleteUserModal');
  if (!modalEl) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="modal fade" id="deleteUserModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Konfirmasi Hapus</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <p id="delete-user-msg">Yakin ingin menghapus user ini?</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
              <button type="button" class="btn btn-danger" id="confirmDeleteUserBtn">Hapus</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrapper);
    modalEl = document.getElementById('deleteUserModal');
  }

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modalEl.querySelector('#delete-user-msg').textContent =
    `Yakin ingin menghapus user "${name}"?`;
  modal.show();

  const confirmBtn = document.getElementById('confirmDeleteUserBtn');
  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true;
    try {
      await userService.delete(id);
      showToast('User berhasil dihapus');
      modal.hide();
      history.pushState(null, '', '/admin/users');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      showToast(err?.message || 'Gagal menghapus user', 'error');
    } finally {
      confirmBtn.disabled = false;
    }
  };
};
