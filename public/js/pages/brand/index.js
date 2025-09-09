import { brandService } from '../../services/brandService.js';
import { renderHeader } from '../../components/header.js';
import { showToast } from '../../utils/toast.js';
import { renderBreadcrumb } from '../../components/breadcrumb.js';
import { showLoader, hideLoader } from '../../components/loader.js';

export async function render(target, path, query = {}, labelOverride = null) {
    showLoader();
    target.innerHTML = '';
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

  function loadBrands(keyword = '', page = 1) {
    showLoader();

    brandService.getAll({ search: keyword, page }).then(data => {
      const brands = data.data || [];

      const listHtml = brands.map((brand, i) => {
        const n = (page - 1) * data.per_page + i + 1;

        const website = brand.website_url
          ? `<a href="${brand.website_url}" target="_blank" rel="noopener">Kunjungi</a>`
          : '-';

        const statusBadge = brand.is_active
          ? '<span class="badge bg-success">Aktif</span>'
          : '<span class="badge bg-secondary">Nonaktif</span>';

        // ambil beberapa sosial (kalau ada)
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
              <button class="btn btn-sm btn-outline-primary me-2 app-link" data-href="/brands/${brand.id}/edit">
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

      if (data.last_page <= 1) {
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
    }).catch(() => {
      document.getElementById('brand-list').innerHTML = `<div class="text-danger">Gagal memuat data brand.</div>`;
    }).finally(() => {
      hideLoader();
    });
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

// ====== Konfirmasi Hapus (global) ======
window.confirmDeleteBrand = function (btn) {
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
      // re-render list
      // ambil target konten dari SPA container
      const app = document.getElementById('app');
      // panggil kembali render halaman brands (path disesuaikan)
      // asumsi file ini diekspor sebagai render(), jadi bisa:
      // import dinamis ulang kalau perlu—lebih simpel: trigger nav ke /brands
      history.pushState(null, '', '/brands');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      showToast('Gagal menghapus brand', 'error');
    } finally {
      confirmBtn.disabled = false;
    }
  };
};
