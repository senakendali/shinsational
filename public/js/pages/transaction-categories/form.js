import { showToast } from "../../utils/toast.js";
import { renderBreadcrumb } from "../../components/breadcrumb.js";
import { showLoader, hideLoader } from "../../components/loader.js";

export async function render(
    target,
    params = {},
    query = {},
    labelOverride = null
) {
    const isEdit = !!params.id;
    const title = isEdit
        ? "Edit Kategori Transaksi"
        : "Tambah Kategori Transaksi Baru";
    const currentPath = isEdit
        ? `/transaction-categories/${params.id}/edit`
        : "/transaction-categories/create";

    showLoader();
    target.innerHTML = "";
    renderBreadcrumb(target, currentPath, labelOverride);

    target.innerHTML += `
        <form id="category-form" class="bg-white p-4 rounded shadow-sm">
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label for="code" class="form-label">Kode <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="code" name="code" 
                           placeholder="Contoh: INC-001" required>
                    <div class="form-text">Format: INC-xxx untuk Pemasukan, EXP-xxx untuk Pengeluaran</div>
                    <div class="invalid-feedback" id="error-code"></div>
                </div>
                <div class="col-md-6 mb-3">
                    <label for="name" class="form-label">Nama Kategori <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="name" name="name" 
                           placeholder="Contoh: Penjualan Proyek" required>
                    <div class="invalid-feedback" id="error-name"></div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6 mb-3">
                    <label for="type" class="form-label">Tipe <span class="text-danger">*</span></label>
                    <select class="form-select" id="type" name="type" required>
                        <option value="">-- Pilih Tipe --</option>
                        <option value="Pemasukan">Pemasukan</option>
                        <option value="Pengeluaran">Pengeluaran</option>
                    </select>
                    <div class="invalid-feedback" id="error-type"></div>
                </div>
                <div class="col-md-6 mb-3">
                    <label for="status" class="form-label">Status <span class="text-danger">*</span></label>
                    <select class="form-select" id="status" name="status" required>
                        <option value="Aktif">Aktif</option>
                        <option value="Non-aktif">Non-aktif</option>
                    </select>
                    <div class="invalid-feedback" id="error-status"></div>
                </div>
            </div>

            <div class="mb-3">
                <label for="description" class="form-label">Deskripsi <span class="text-danger">*</span></label>
                <textarea class="form-control" id="description" name="description" rows="3" 
                          placeholder="Masukkan deskripsi kategori transaksi..." required></textarea>
                <div class="invalid-feedback" id="error-description"></div>
            </div>

            <div class="d-flex justify-content-between mt-4">
                <button type="submit" class="btn btn-primary">
                    <i class="bi bi-save"></i> ${isEdit ? "Update" : "Simpan"}
                </button>
                <button type="button" class="btn btn-secondary" id="cancelBtn">
                    <i class="bi bi-x-square"></i> Batal
                </button>
            </div>
        </form>
    `;

    const cancelBtn = document.getElementById("cancelBtn");
    cancelBtn.addEventListener("click", () => {
        history.pushState(null, "", "/transaction-categories");
        window.dispatchEvent(new PopStateEvent("popstate"));
    });

    // Auto-generate code berdasarkan tipe yang dipilih
    const typeSelect = document.getElementById("type");
    const codeInput = document.getElementById("code");

    typeSelect.addEventListener("change", function () {
        if (this.value && !codeInput.value) {
            const prefix = this.value === "Pemasukan" ? "INC" : "EXP";
            // Generate nomor urut sederhana untuk demo
            const number = String(Math.floor(Math.random() * 999) + 1).padStart(
                3,
                "0"
            );
            codeInput.value = `${prefix}-${number}`;
        }
    });

    const form = document.getElementById("category-form");
    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        showLoader();

        const formData = new FormData(form);
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            // Simulasi proses submit (karena belum ada API)
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const action = isEdit ? "diperbarui" : "ditambahkan";
            showToast(`Kategori transaksi berhasil ${action}`);

            history.pushState(null, "", "/transaction-categories");
            window.dispatchEvent(new PopStateEvent("popstate"));
        } catch (err) {
            showToast("Gagal menyimpan kategori transaksi", "error");
        } finally {
            hideLoader();
            submitBtn.disabled = false;
        }
    });

    if (isEdit) {
        // Nanti load data dari API ketika categoryService sudah ready
        // categoryService.get(params.id).then(data => {
        //   for (let key in data) {
        //     const el = document.getElementById(key);
        //     if (el) {
        //       el.value = data[key] ?? '';
        //     }
        //   }
        // });
    }

    hideLoader();
}
