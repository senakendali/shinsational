import { projectService } from '../../services/projectService.js';
import { showToast } from '../../utils/toast.js';
import { renderBreadcrumb } from '../../components/breadcrumb.js';
import { showLoader, hideLoader } from '../../components/loader.js';

export async function render(target, path, query = {}, labelOverride = null) {
    showLoader();
    target.innerHTML = '';
    renderBreadcrumb(target, path, labelOverride);

    target.innerHTML += `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <input class="form-control w-50" type="search" placeholder="Cari proyek..." id="searchInput">
            <button class="btn btn-outline-primary" id="addNew">
                <i class="bi bi-plus-lg"></i> Tambah Proyek
            </button>
        </div>
        <div id="project-list"></div>
        <nav class="mt-3">
            <ul class="pagination" id="pagination"></ul>
        </nav>
    `;

    const addBtn = document.getElementById('addNew');
    addBtn.addEventListener('click', () => {
        history.pushState(null, '', '/projects/create');
        window.dispatchEvent(new PopStateEvent('popstate'));
    });

    let currentPage = 1;
    let searchKeyword = '';
    let searchTimeout = null;

    function loadProjects(keyword = '', page = 1) {
        showLoader();
        projectService.getAll({ search: keyword, page }).then(data => {
            const projects = data.data || [];
            const listHtml = projects.map((project, i) => `
                <tr>
                    <td>${(page - 1) * data.per_page + i + 1}</td>
                    <td>${project.name}</td>
                    <td>${project.client?.name || '-'}</td>
                    <td>${project.status}</td>
                    <td>${project.start_date || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-2 app-link" data-href="/projects/${project.id}/edit">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger" data-id="${project.id}" data-name="${project.name}" onclick="confirmDeleteProject(this)">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="6" class="text-center text-muted">Tidak ada data</td></tr>';

            document.getElementById('project-list').innerHTML = `
                <table class="table table-bordered bg-white">
                    <thead>
                        <tr><th colspan="6" class="text-uppercase">Proyek</th></tr>
                        <tr>
                            <th>#</th>
                            <th>Nama Proyek</th>
                            <th>Klien</th>
                            <th>Status</th>
                            <th>Tgl Mulai</th>
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
                    li.addEventListener('click', (e) => {
                        e.preventDefault();
                        currentPage = i;
                        loadProjects(searchKeyword, currentPage);
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
            document.getElementById('project-list').innerHTML = `<div class="text-danger">Gagal memuat data proyek.</div>`;
        }).finally(() => {
            hideLoader();
        });
    }

    document.getElementById('searchInput').addEventListener('input', function (e) {
        searchKeyword = e.target.value;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            loadProjects(searchKeyword, currentPage);
        }, 300);
    });

    loadProjects();
}

window.confirmDeleteProject = function (btn) {
    const id = btn.getAttribute('data-id');
    const name = btn.getAttribute('data-name');
    const messageEl = document.getElementById('delete-message') || document.createElement('div');
    messageEl.textContent = `Yakin ingin menghapus proyek "${name}"?`;

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
                            <p id="delete-message">Yakin ingin menghapus proyek ini?</p>
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
            await projectService.delete(id);
            showToast('Proyek berhasil dihapus');
            modal.hide();
            render(document.getElementById('app'), '/projects');
        } catch (err) {
            showToast('Gagal menghapus proyek', 'error');
        } finally {
            confirmBtn.disabled = false;
        }
    };
};
