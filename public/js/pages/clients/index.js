import { clientService } from '../../services/clientService.js';
import { showToast } from '../../utils/toast.js';
import { renderBreadcrumb } from '../../components/breadcrumb.js';
import { showLoader, hideLoader } from '../../components/loader.js';

export async function render(target, path, query = {}, labelOverride = null) {
    showLoader();
    target.innerHTML = '';
    renderBreadcrumb(target, path, labelOverride);

    target.innerHTML += `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <input class="form-control w-50" type="search" placeholder="Cari klien..." id="searchInput">
            <button class="btn btn-outline-primary" id="addNew">
                <i class="bi bi-plus-lg"></i> Tambah Klien
            </button>
        </div>
        <div id="client-list"></div>
        <nav class="mt-3">
            <ul class="pagination" id="pagination"></ul>
        </nav>
    `;

    const addBtn = document.getElementById('addNew');
    addBtn.addEventListener('click', () => {
        history.pushState(null, '', '/clients/create');
        window.dispatchEvent(new PopStateEvent('popstate'));
    });

    let currentPage = 1;
    let searchKeyword = '';
    let searchTimeout = null;

    function loadClients(keyword = '', page = 1) {
        showLoader();
        clientService.getAll({ search: keyword, page }).then(data => {
            const clients = data.data || [];
            const listHtml = clients.map((client, i) => `
                <tr>
                    <td>${(page - 1) * data.per_page + i + 1}</td>
                    <td>${client.name}</td>
                    <td>${client.email || '-'}</td>
                    <td>${client.phone || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-2 app-link" data-href="/clients/${client.id}/edit">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger" data-id="${client.id}" data-name="${client.name}" onclick="confirmDeleteClient(this)">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="5" class="text-center text-muted">Tidak ada data</td></tr>';

            document.getElementById('client-list').innerHTML = `
                <table class="table table-bordered bg-white">
                    <thead>
                        <tr><th colspan="5" class="text-uppercase">Klien</th></tr>
                        <tr>
                            <th>#</th>
                            <th>Nama Klien</th>
                            <th>Email</th>
                            <th>Telepon</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>${listHtml}</tbody>
                </table>
            `;

            // Pagination
            const pagination = document.getElementById('pagination');
                pagination.innerHTML = '';

                // Sembunyikan pagination jika hanya 1 halaman
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
                loadClients(searchKeyword, currentPage);
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
            document.getElementById('client-list').innerHTML = `<div class="text-danger">Gagal memuat data klien.</div>`;
        }).finally(() => {
            hideLoader();
        });
    }

    document.getElementById('searchInput').addEventListener('input', function (e) {
        searchKeyword = e.target.value;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            loadClients(searchKeyword, currentPage);
        }, 300);
    });

    loadClients(); // Initial load
}

window.confirmDeleteClient = function (btn) {
    const id = btn.getAttribute('data-id');
    const name = btn.getAttribute('data-name');
    const messageEl = document.getElementById('delete-message') || document.createElement('div');
    messageEl.textContent = `Yakin ingin menghapus klien "${name}"?`;

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
                            <p id="delete-message">Yakin ingin menghapus klien ini?</p>
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
            await clientService.delete(id);
            showToast('Klien berhasil dihapus');
            modal.hide();
            render(document.getElementById('app'), '/clients');
        } catch (err) {
            showToast('Gagal menghapus klien', 'error');
        } finally {
            confirmBtn.disabled = false;
        }
    };
};
