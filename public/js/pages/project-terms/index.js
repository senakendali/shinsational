import { projectTermService } from '../../services/projectTermService.js';
import { showToast } from '../../utils/toast.js';
import { renderBreadcrumb } from '../../components/breadcrumb.js';
import { showLoader, hideLoader } from '../../components/loader.js';

export async function render(target, params = {}, query = {}, labelOverride = null) {
    showLoader();
    target.innerHTML = '';
    renderBreadcrumb(target, window.location.pathname, labelOverride);

    target.innerHTML += `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <input class="form-control w-50" type="search" placeholder="Cari termin proyek..." id="searchInput">
            <button class="btn btn-outline-primary" id="addNew">
                <i class="bi bi-plus-lg"></i> Tambah Termin
            </button>
        </div>
        <div id="term-list"></div>
        <nav class="mt-3">
            <ul class="pagination" id="pagination"></ul>
        </nav>
    `;

    document.getElementById('addNew').addEventListener('click', () => {
        history.pushState(null, '', '/project-terms/create');
        window.dispatchEvent(new PopStateEvent('popstate'));
    });

    let currentPage = 1;
    let searchKeyword = '';
    let searchTimeout = null;

    function loadTerms(keyword = '', page = 1) {
        showLoader();
        projectTermService.getAll({ search: keyword, page }).then(data => {
            const terms = data.data || [];
            const listHtml = terms.map((term, i) => `
                    <tr>
                    
                        <td>${(page - 1) * data.per_page + i + 1}</td>
                        <td>${term.project?.name || '-'}</td>
                        <td>${term.title}</td>
                        <td>${Number(term.amount).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</td>
                        <td>${term.due_date || '-'}</td>
                        <td><span class="badge bg-${term.status === 'dibayar' ? 'success' : 'warning'}">${term.status}</span></td>
                        <td class="d-flex flex-wrap gap-2">
                            <button class="btn btn-sm btn-outline-primary app-link" data-href="/project-terms/${term.id}/edit">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="navigateTo('/project-terms/${term.id}/invoice')">
                            <i class="bi bi-file-earmark-text"></i> Invoice
                            </button>

                            <button class="btn btn-sm btn-outline-danger" data-id="${term.id}" data-title="${term.title}" onclick="confirmDeleteTerm(this)">
                                <i class="bi bi-trash"></i> Delete
                            </button>
                        </td>
                    </tr>
                    `).join('') || '<tr><td colspan="7" class="text-center text-muted">Tidak ada data</td></tr>';


            document.getElementById('term-list').innerHTML = `
                <table class="table table-bordered bg-white">
                    <thead>
                        <tr><th colspan="6" class="text-uppercase">Termin Proyek</th></tr>
                        <tr>
                            <th>#</th>
                            <th>Nama Proyek</th>
                            <th>Termin</th>
                            <th>Jumlah</th>
                            <th>Jatuh Tempo</th>
                            <th>Status</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>${listHtml}</tbody>
                </table>
            `;

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
                    li.addEventListener('click', e => {
                        e.preventDefault();
                        currentPage = i;
                        loadTerms(searchKeyword, currentPage);
                    });
                    pagination.appendChild(li);
                }
            }

            document.querySelectorAll('.app-link').forEach(link => {
                link.addEventListener('click', e => {
                    e.preventDefault();
                    const href = link.getAttribute('data-href');
                    history.pushState(null, '', href);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                });
            });
        }).catch(() => {
            document.getElementById('term-list').innerHTML = `<div class="text-danger">Gagal memuat data termin.</div>`;
        }).finally(() => {
            hideLoader();
        });
    }

    document.getElementById('searchInput').addEventListener('input', function (e) {
        searchKeyword = e.target.value;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            loadTerms(searchKeyword, currentPage);
        }, 300);
    });

    loadTerms();
}

window.confirmDeleteTerm = function (btn) {
    const id = btn.getAttribute('data-id');
    const title = btn.getAttribute('data-title');
    const messageEl = document.getElementById('delete-message') || document.createElement('div');
    messageEl.textContent = `Yakin ingin menghapus termin "${title}"?`;

    let modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
    if (!modal) {
        const modalHtml = document.createElement('div');
        modalHtml.innerHTML = `
            <div class="modal fade" id="deleteModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Konfirmasi Hapus</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p id="delete-message">Yakin ingin menghapus termin ini?</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                            <button type="button" class="btn btn-danger" id="confirmDeleteBtn">Hapus</button>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modalHtml);
        modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    }

    modal.show();

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.onclick = async () => {
        confirmBtn.disabled = true;
        try {
            await projectTermService.delete(id);
            showToast('Termin berhasil dihapus');
            render(document.getElementById('app'), '/project-terms');
        } catch (err) {
            showToast('Gagal menghapus termin', 'error');
        } finally {
            confirmBtn.disabled = false;
        }
    };
};
