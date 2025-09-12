// NOTE: semua import dibuat dinamis + cache buster v
export async function render(target, path, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();

  const [
    { brandService },
    { renderHeader },
    { showToast },                // dipakai utk notifikasi dlm halaman ini (kalau perlu)
    { renderBreadcrumb },
    loaderMod
  ] = await Promise.all([
    import(`../../services/brandService.js?v=${v}`),
    import(`../../components/header.js?v=${v}`),
    import(`../../utils/toast.js?v=${v}`),
    import(`../../components/breadcrumb.js?v=${v}`),
    import(`../../components/loader.js?v=${v}`)
  ]);

  const { showLoader, hideLoader } = loaderMod;

  target.innerHTML = '';
  showLoader();
  renderHeader("header");
  renderBreadcrumb(target, path, labelOverride);

  target.innerHTML += `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <input class="form-control w-50" type="search" placeholder="Cari brand..." id="searchInput">
      <button class="btn btn-outline-primary" id="addNew">
        <i class="bi bi-plus-lg"></i> Tambah Brand
      </button>
    </div>
    <div id="brand-list"></div>
    <nav class="mt-3">
      <ul class="pagination" id="pagination"></ul>
    </nav>
  `;

  // Tambah → ke form create
  const addBtn = document.getElementById('addNew');
  addBtn.addEventListener('click', () => {
    history.pushState(null, '', '/admin/brands/create');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  let currentPage = 1;
  let searchKeyword = '';
  let searchTimeout = null;

  async function loadBrands(keyword = '', page = 1) {
    showLoader();

    try {
      const data = await brandService.getAll({ search: keyword, page });
      const brands = data.data || [];

      const listHtml = brands.map((brand, i) => {
        const n = (page - 1) * data.per_page + i + 1;

        const website = brand.website_url
          ? `<a href="${brand.website_url}" target="_blank" rel="noopener">Kunjungi</a>`
          : '-';

        const statusBadge = brand.is_active
          ? '<span class="badge bg-success">Aktif</span>'
          : '<span class="badge bg-secondary">Nonaktif</span>';

        const s = brand.socials || {};
        const socialsText = [
          s.tiktok ? `TikTok: ${s.tiktok}` : null,
          s.instagram ? `IG: ${s.instagram}` : null,
          s.youtube ? `YT: ${s.youtube}` : null,
        ].filter(Boolean).join(' • ');
        const socialsHtml = socialsText ? `<div class="text-muted small">${socialsText}</div>` : '';

        return `
          <tr>
            <td>${n}</td>
            <td>
              <div class="fw-semibold">${brand.name}</div>
              ${socialsHtml}
            </td>
            <td><code>${brand.slug || '-'}</code></td>
            <td>${website}</td>
            <td>${statusBadge}</td>
            <td>
              <button class="btn btn-sm btn-outline-primary me-2 app-link" data-href="/admin/brands/${brand.id}/edit">
                <i class="bi bi-pencil"></i> Edit
              </button>
              <button class="btn btn-sm btn-outline-danger" 
                      data-id="${brand.id}" 
                      data-name="${brand.name}"
                      onclick="confirmDeleteBrand(this)">
                <i class="bi bi-trash"></i> Delete
              </button>
            </td>
          </tr>
        `;
      }).join('') || '<tr><td colspan="6" class="text-center text-muted">Tidak ada data</td></tr>';

      document.getElementById('brand-list').innerHTML = `
        <table class="table table-bordered bg-white">
          <thead>
            <tr><th colspan="6" class="text-uppercase">Brands</th></tr>
            <tr>
              <th>#</th>
              <th>Nama Brand</th>
              <th>Slug</th>
              <th>Website</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>${listHtml}</tbody>
        </table>
      `;

      // Pagination
      const pagination = document.getElementById('pagination');
      pagination.innerHTML = '';

      if ((data.last_page ?? 1) <= 1) {
        pagination.style.display = 'none';
      } else {
        pagination.style.display = 'flex';
        for (let i = 1; i <= data.last_page; i++) {
          const li = document.createElement('li');
          li.className = `page-item ${i === data.current_page ? 'active' : ''}`;
          li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
          li.addEventListener('click', (e) => {
            e.preventDefault();
            currentPage = i;
            loadBrands(searchKeyword, currentPage);
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
    } catch (e) {
      document.getElementById('brand-list').innerHTML = `<div class="text-danger">Gagal memuat data brand.</div>`;
    } finally {
      hideLoader();
    }
  }

  // Search debounce
  document.getElementById('searchInput').addEventListener('input', function (e) {
    searchKeyword = e.target.value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      loadBrands(searchKeyword, currentPage);
    }, 300);
  });

  loadBrands(); // initial
}

// ====== Konfirmasi Hapus (global) → dynamic import di dalam fungsi ======
window.confirmDeleteBrand = async function (btn) {
  const v = window.BUILD_VERSION || Date.now();
  const [{ brandService }, { showToast }] = await Promise.all([
    import(`../../services/brandService.js?v=${v}`),
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
  modalEl.querySelector('#delete-message').textContent = `Yakin ingin menghapus brand "${name}"?`;
  modal.show();

  const confirmBtn = document.getElementById('confirmDeleteBtn');
  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true;
    try {
      await brandService.delete(id);
      showToast('Brand berhasil dihapus');
      modal.hide();
      // re-render list → konsisten pakai route /admin/brands
      history.pushState(null, '', '/admin/brands');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      showToast('Gagal menghapus brand', 'error');
    } finally {
      confirmBtn.disabled = false;
    }
  };
};
