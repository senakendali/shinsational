import { showToast } from "../../utils/toast.js";
import { renderBreadcrumb } from "../../components/breadcrumb.js";
import { showLoader, hideLoader } from "../../components/loader.js";

export async function render(target, path, query = {}, labelOverride = null) {
    showLoader();
    target.innerHTML = "";
    renderBreadcrumb(target, path, labelOverride);

    target.innerHTML += `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="d-flex gap-2">
                <input class="form-control" type="search" placeholder="Cari kategori..." id="searchInput" style="width: 300px;">
                <select class="form-select" id="filterType" style="width: 150px;">
                    <option value="">Semua Tipe</option>
                    <option value="Pemasukan">Pemasukan</option>
                    <option value="Pengeluaran">Pengeluaran</option>
                </select>
            </div>
            <button class="btn btn-outline-primary" id="addNew">
                <i class="bi bi-plus-lg"></i> Tambah Kategori
            </button>
        </div>
        <div id="category-list"></div>
        <nav class="mt-3">
            <ul class="pagination" id="pagination"></ul>
        </nav>
    `;

    const addBtn = document.getElementById("addNew");
    addBtn.addEventListener("click", () => {
        history.pushState(null, "", "/transaction-categories/create");
        window.dispatchEvent(new PopStateEvent("popstate"));
    });

    let currentPage = 1;
    let searchKeyword = "";
    let filterType = "";
    let searchTimeout = null;

    function loadCategories(keyword = "", type = "", page = 1) {
        showLoader();

        // Dummy Data
        const sampleData = [
            {
                id: 1,
                code: "INC-001",
                name: "Penjualan Proyek",
                type: "Pemasukan",
                description: "Pendapatan dari proyek klien",
                status: "Aktif",
            },
            {
                id: 2,
                code: "EXP-001",
                name: "Gaji Karyawan",
                type: "Pengeluaran",
                description: "Pembayaran gaji bulanan",
                status: "Aktif",
            },
            {
                id: 3,
                code: "EXP-002",
                name: "Biaya Operasional",
                type: "Pengeluaran",
                description: "Listrik, air, dll",
                status: "Aktif",
            },
        ];

        // Filter data berdasarkan keyword dan type
        let filteredData = sampleData;
        if (keyword) {
            filteredData = filteredData.filter(
                (item) =>
                    item.name.toLowerCase().includes(keyword.toLowerCase()) ||
                    item.code.toLowerCase().includes(keyword.toLowerCase()) ||
                    item.description
                        .toLowerCase()
                        .includes(keyword.toLowerCase())
            );
        }
        if (type) {
            filteredData = filteredData.filter((item) => item.type === type);
        }

        let listHtml = "";
        if (filteredData.length === 0) {
            listHtml =
                '<tr><td colspan="6" class="text-center text-muted">Tidak ada data</td></tr>';
        } else {
            filteredData.forEach((item, index) => {
                const statusBadge =
                    item.status === "Aktif"
                        ? '<span class="badge bg-success">Aktif</span>'
                        : '<span class="badge bg-secondary">Non-aktif</span>';

                const typeBadge =
                    item.type === "Pemasukan"
                        ? '<span class="badge bg-info">Pemasukan</span>'
                        : '<span class="badge bg-warning">Pengeluaran</span>';

                listHtml += `
                    <tr>
                        <td>${(page - 1) * 10 + index + 1}</td>
                        <td><code>${item.code}</code></td>
                        <td><strong>${item.name}</strong></td>
                        <td>${typeBadge}</td>
                        <td>${item.description}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="editCategory(${
                                    item.id
                                })" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-outline-danger" onclick="confirmDeleteCategory(this)" 
                                data-id="${item.id}" data-name="${
                    item.name
                }" title="Hapus">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        document.getElementById("category-list").innerHTML = `
            <table class="table table-bordered bg-white">
                <thead>
                    <tr><th colspan="7" class="text-uppercase">Master Kategori Transaksi</th></tr>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th style="width: 100px;">Kode</th>
                        <th>Nama Kategori</th>
                        <th style="width: 120px;">Tipe</th>
                        <th>Deskripsi</th>
                        <th style="width: 80px;">Status</th>
                        <th style="width: 120px;">Aksi</th>
                    </tr>
                </thead>
                <tbody>${listHtml}</tbody>
            </table>
        `;

        // Sembunyikan pagination untuk sementara
        const pagination = document.getElementById("pagination");
        pagination.innerHTML = "";
        pagination.style.display = "none";

        hideLoader();
    }

    document
        .getElementById("searchInput")
        .addEventListener("input", function (e) {
            searchKeyword = e.target.value;
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                loadCategories(searchKeyword, filterType, currentPage);
            }, 300);
        });

    document
        .getElementById("filterType")
        .addEventListener("change", function (e) {
            filterType = e.target.value;
            currentPage = 1;
            loadCategories(searchKeyword, filterType, currentPage);
        });

    loadCategories();
}

window.editCategory = function (id) {
    history.pushState(null, "", `/transaction-categories/${id}/edit`);
    window.dispatchEvent(new PopStateEvent("popstate"));
};

window.confirmDeleteCategory = function (btn) {
    const id = btn.getAttribute("data-id");
    const name = btn.getAttribute("data-name");
    const messageEl =
        document.getElementById("delete-message") ||
        document.createElement("div");
    messageEl.textContent = `Yakin ingin menghapus kategori "${name}"?`;

    let modal = bootstrap.Modal.getInstance(
        document.getElementById("deleteModal")
    );
    if (!modal) {
        const modalHtml = document.createElement("div");
        modalHtml.innerHTML = `
            <div class="modal fade" id="deleteModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Konfirmasi Hapus</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p id="delete-message">Yakin ingin menghapus kategori ini?</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                            <button type="button" class="btn btn-danger" id="confirmDeleteBtn">Hapus</button>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modalHtml);
        modal = new bootstrap.Modal(document.getElementById("deleteModal"));
    }

    modal.show();

    const confirmBtn = document.getElementById("confirmDeleteBtn");
    confirmBtn.onclick = async () => {
        confirmBtn.disabled = true;
        try {
            // Simulasi delete berhasil (karena belum ada API)
            showToast("Kategori transaksi berhasil dihapus");
            modal.hide();
            render(document.getElementById("app"), "/transaction-categories");
        } catch (err) {
            showToast("Gagal menghapus kategori transaksi", "error");
        } finally {
            confirmBtn.disabled = false;
        }
    };
};
