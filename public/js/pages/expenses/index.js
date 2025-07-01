import { showToast } from "../../utils/toast.js";
import { renderBreadcrumb } from "../../components/breadcrumb.js";
import { showLoader, hideLoader } from "../../components/loader.js";

export async function render(target, path, query = {}, labelOverride = null) {
    showLoader();
    target.innerHTML = "";
    renderBreadcrumb(target, path, labelOverride);

    target.innerHTML += `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <input class="form-control w-50" type="search" placeholder="Cari pengeluaran..." id="searchInput">
            <button class="btn btn-outline-primary" id="addNew">
                <i class="bi bi-plus-lg"></i> Tambah Pengeluaran
            </button>
        </div>
        <div id="expense-list"></div>
        <nav class="mt-3">
            <ul class="pagination" id="pagination"></ul>
        </nav>
    `;

    const addBtn = document.getElementById("addNew");
    addBtn.addEventListener("click", () => {
        history.pushState(null, "", "/expenses/create");
        window.dispatchEvent(new PopStateEvent("popstate"));
    });

    let currentPage = 1;
    let searchKeyword = "";
    let searchTimeout = null;

    function loadExpenses(keyword = "", page = 1) {
        showLoader();

        const listHtml =
            '<tr><td colspan="10" class="text-center text-muted">Tidak ada data</td></tr>';

        document.getElementById("expense-list").innerHTML = `
            <table class="table table-bordered bg-white">
                <thead>
                    <tr><th colspan="10" class="text-uppercase">Pengeluaran</th></tr>
                    <tr>
                        <th>#</th>
                        <th>Tanggal</th>
                        <th>Proyek</th>
                        <th>Kategori Transaksi</th>
                        <th>Metode Pembayaran</th>
                        <th>Akun Sumber</th>
                        <th>Jumlah</th>
                        <th>Deskripsi / Catatan</th>
                        <th>Lampiran</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>${listHtml}</tbody>
            </table>
        `;

        // Sembunyikan pagination karena belum ada data
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
                loadExpenses(searchKeyword, currentPage);
            }, 300);
        });

    loadExpenses();
}

window.confirmDeleteExpense = function (btn) {
    const id = btn.getAttribute("data-id");
    const name = btn.getAttribute("data-name");
    const messageEl =
        document.getElementById("delete-message") ||
        document.createElement("div");
    messageEl.textContent = `Yakin ingin menghapus pengeluaran "${name}"?`;

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
                            <p id="delete-message">Yakin ingin menghapus pengeluaran ini?</p>
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
            showToast("Pengeluaran berhasil dihapus");
            modal.hide();
            render(document.getElementById("app"), "/expenses");
        } catch (err) {
            showToast("Gagal menghapus pengeluaran", "error");
        } finally {
            confirmBtn.disabled = false;
        }
    };
};
