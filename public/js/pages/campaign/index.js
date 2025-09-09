import { renderHeader } from '../../components/header.js';
import { campaignService } from '../../services/campaignService.js';
import { brandService } from '../../services/brandService.js';
import { showToast } from '../../utils/toast.js';
import { renderBreadcrumb } from '../../components/breadcrumb.js';
import { showLoader, hideLoader } from '../../components/loader.js';
import { formatNumber } from '../../utils/number.js';

export async function render(target, path, query = {}, labelOverride = null) {
  showLoader();
  target.innerHTML = '';

  renderHeader("header");
  renderBreadcrumb(target, path, labelOverride);

  target.innerHTML += `
    <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <input class="form-control" style="min-width:220px" type="search" placeholder="Cari campaign..." id="searchInput">
        <select id="brandFilter" class="form-select" style="min-width:200px">
          <option value="">Semua Brand</option>
        </select>
        <select id="statusFilter" class="form-select" style="min-width:180px">
          <option value="">Semua Status</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <button class="btn btn-outline-primary" id="addNew">
        <i class="bi bi-plus-lg"></i> Tambah Campaign
      </button>
    </div>
    <div id="campaign-list"></div>
    <nav class="mt-3">
      <ul class="pagination" id="pagination"></ul>
    </nav>
  `;

  // Tambah → create
  document.getElementById('addNew').addEventListener('click', () => {
    history.pushState(null, '', '/admin/campaigns/create');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  // Populate brand filter
  try {
    const brands = (await brandService.getAll({ page: 1 }))?.data || [];
    const bf = document.getElementById('brandFilter');
    bf.innerHTML = `<option value="">Semua Brand</option>` + brands.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
  } catch (_) {
    // ignore
  }

  let currentPage = 1;
  let searchKeyword = '';
  let brandId = '';
  let status = '';
  let searchTimeout = null;

  async function loadCampaigns(keyword = '', page = 1, brand = '', st = '') {
    showLoader();
    try {
      const data = await campaignService.getAll({
        search: keyword || '',
        page,
        brand_id: brand || '',
        status: st || ''
      });

      const items = data.data || [];
      const listHtml = items.map((c, i) => {
        const n = (page - 1) * data.per_page + i + 1;
        const period = [
          c.start_date ? new Date(c.start_date).toLocaleDateString('id-ID') : null,
          c.end_date ? new Date(c.end_date).toLocaleDateString('id-ID') : null
        ].filter(Boolean).join(' - ') || '-';

        const statusBadge = c.status
          ? `<span class="badge text-bg-${
              c.status === 'active' ? 'success' :
              c.status === 'paused' ? 'warning' :
              c.status === 'completed' ? 'primary' :
              c.status === 'archived' ? 'secondary' :
              c.status === 'scheduled' ? 'info' : 'light'
            }">${c.status}</span>`
          : '';

        const activeBadge = c.is_active
          ? '<span class="badge bg-success">Aktif</span>'
          : '<span class="badge bg-secondary">Nonaktif</span>';

        // Budget dengan format ribuan (tanpa desimal), plus kode mata uang
        const budgetText =
          (c.budget != null && c.budget !== '')
            ? `${formatNumber(String(Math.trunc(Number(c.budget))))} ${c.currency || ''}`
            : '-';

        return `
          <tr>
            <td>${n}</td>
            <td>
              <div class="fw-semibold">${c.name}</div>
              <div class="text-muted small">${c.code ? `<code>${c.code}</code> • ` : ''}${c.slug ? `<code>${c.slug}</code>` : ''}</div>
            </td>
            <td>${c.brand?.name ?? '-'}</td>
            <td>${period}</td>
            <td>${statusBadge} ${activeBadge}</td>
            <td>${budgetText}</td>
            <td class="d-flex gap-2 flex-wrap">
              <button class="btn btn-sm btn-outline-primary app-link" data-href="/admin/campaigns/${c.id}/edit">
                <i class="bi bi-pencil"></i> Edit
              </button>
              <button class="btn btn-sm btn-outline-danger" data-id="${c.id}" data-name="${c.name}" onclick="confirmDeleteCampaign(this)">
                <i class="bi bi-trash"></i> Delete
              </button>
              <button class="btn btn-sm btn-outline-success" data-id="${c.id}" data-name="${c.name}" data-slug="${c.slug || ''}" onclick="copyCampaignLink(this)">
                <i class="bi bi-link-45deg"></i> Copy Link
              </button>
            </td>
          </tr>
        `;
      }).join('') || '<tr><td colspan="7" class="text-center text-muted">Tidak ada data</td></tr>';

      document.getElementById('campaign-list').innerHTML = `
        <table class="table table-bordered bg-white">
          <thead>
            <tr><th colspan="7" class="text-uppercase">Campaigns</th></tr>
            <tr>
              <th>#</th>
              <th>Nama</th>
              <th>Brand</th>
              <th>Periode</th>
              <th>Status</th>
              <th>Budget</th>
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
            loadCampaigns(searchKeyword, currentPage, brandId, status);
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
      document.getElementById('campaign-list').innerHTML = `<div class="text-danger">Gagal memuat data campaign.</div>`;
    } finally {
      hideLoader();
    }
  }

  // Filters
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchKeyword = e.target.value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      loadCampaigns(searchKeyword, currentPage, brandId, status);
    }, 300);
  });

  document.getElementById('brandFilter').addEventListener('change', (e) => {
    brandId = e.target.value;
    currentPage = 1;
    loadCampaigns(searchKeyword, currentPage, brandId, status);
  });

  document.getElementById('statusFilter').addEventListener('change', (e) => {
    status = e.target.value;
    currentPage = 1;
    loadCampaigns(searchKeyword, currentPage, brandId, status);
  });

  loadCampaigns(); // initial
}

// ====== Konfirmasi Hapus (global) ======
window.confirmDeleteCampaign = function (btn) {
  const id = btn.getAttribute('data-id');
  const name = btn.getAttribute('data-name');

  let modalEl = document.getElementById('deleteModal');
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

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modalEl.querySelector('#delete-message').textContent = `Yakin ingin menghapus campaign "${name}"?`;
  modal.show();

  const confirmBtn = document.getElementById('confirmDeleteBtn');
  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true;
    try {
      await campaignService.delete(id);
      showToast('Campaign berhasil dihapus');
      modal.hide();
      // reload halaman list (pakai admin)
      history.pushState(null, '', '/admin/campaigns');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      showToast('Gagal menghapus campaign', 'error');
    } finally {
      confirmBtn.disabled = false;
    }
  };
};

// ====== Copy Link Pendaftaran (global) ======
window.copyCampaignLink = async function (btn) {
  const slug = btn.getAttribute('data-slug') || '';
  const id = btn.getAttribute('data-id');
  // fallback identifier kalau slug kosong
  const ident = slug || `campaign-${id}`;
  // format link: /register?<slug-campaign>
  const link = `${location.origin}/registration?${encodeURIComponent(ident)}`;

  // try clipboard API → fallback ke textarea
  const doToast = (msg, type = 'success') => showToast(msg, type);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(link);
      doToast('Link pendaftaran disalin!');
    } else {
      throw new Error('Clipboard API tidak tersedia');
    }
  } catch (_) {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = link;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      doToast('Link pendaftaran disalin!');
    } catch (e2) {
      doToast('Gagal menyalin link.', 'error');
    } finally {
      document.body.removeChild(ta);
    }
  }
};
