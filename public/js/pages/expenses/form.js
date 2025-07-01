import { showToast } from "../../utils/toast.js";
import { renderBreadcrumb } from "../../components/breadcrumb.js";
import { showLoader, hideLoader } from "../../components/loader.js";
import { formatNumber, unformatNumber } from "../../utils/number.js";

export async function render(
    target,
    params = {},
    query = {},
    labelOverride = null
) {
    const isEdit = !!params.id;
    const title = isEdit ? "Edit Pengeluaran" : "Tambah Pengeluaran Baru";
    const currentPath = isEdit
        ? `/expenses/${params.id}/edit`
        : "/expenses/create";

    showLoader();
    target.innerHTML = "";
    renderBreadcrumb(target, currentPath, labelOverride);

    target.innerHTML += `
        <form id="expense-form" class="bg-white p-4 rounded shadow-sm">
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label for="date" class="form-label">Tanggal <span class="text-danger">*</span></label>
                    <input type="date" class="form-control" id="date" name="date" required>
                    <div class="invalid-feedback" id="error-date"></div>
                </div>
                <div class="col-md-6 mb-3">
                    <label for="project" class="form-label">Proyek</label>
                    <select class="form-select" id="project" name="project">
                        <option value="">-- Pilih Proyek --</option>
                        <option value="website_bumn">Website BUMN</option>
                        <option value="sistem_evoting">Sistem E-Voting Pemilu</option>
                        <option value="app_kepegawaian">Aplikasi Kepegawaian</option>
                    </select>
                    <div class="invalid-feedback" id="error-project"></div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6 mb-3">
                    <label for="category" class="form-label">Kategori Transaksi <span class="text-danger">*</span></label>
                    <select class="form-select" id="category" name="category" required>
                        <option value="">-- Pilih Kategori --</option>
                        <option value="operasional">Operasional</option>
                        <option value="gaji_karyawan">Gaji Karyawan</option>
                        <option value="sewa_kantor">Sewa Kantor</option>
                        <option value="listrik_air">Listrik & Air</option>
                        <option value="internet_telpon">Internet & Telepon</option>
                        <option value="transportasi">Transportasi</option>
                        <option value="konsumsi">Konsumsi</option>
                        <option value="peralatan_kantor">Peralatan Kantor</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="marketing">Marketing</option>
                        <option value="pajak">Pajak</option>
                        <option value="pengeluaran_lain">Pengeluaran Lain-lain</option>
                    </select>
                    <div class="invalid-feedback" id="error-category"></div>
                </div>
                <div class="col-md-6 mb-3">
                    <label for="payment_method" class="form-label">Metode Pembayaran <span class="text-danger">*</span></label>
                    <select class="form-select" id="payment_method" name="payment_method" required>
                        <option value="">-- Pilih Metode --</option>
                        <option value="tunai">Tunai</option>
                        <option value="transfer_bank">Transfer Bank</option>
                        <option value="qris">QRIS</option>
                        <option value="kartu_kredit">Kartu Kredit</option>
                        <option value="cek">Cek</option>
                        <option value="kartu_debit">Kartu Debit</option>
                    </select>
                    <div class="invalid-feedback" id="error-payment_method"></div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6 mb-3">
                    <label for="source_account" class="form-label">Akun Sumber <span class="text-danger">*</span></label>
                    <select class="form-select" id="source_account" name="source_account" required>
                        <option value="">-- Pilih Akun Sumber --</option>
                        <option value="bca_1234567890">Bank BCA - 1234567890</option>
                        <option value="mandiri_0987654321">Bank Mandiri - 0987654321</option>
                        <option value="bri_1122334455">Bank BRI - 1122334455</option>
                        <option value="kas_kecil">Kas Kecil</option>
                        <option value="kas_besar">Kas Besar</option>
                    </select>
                    <div class="invalid-feedback" id="error-source_account"></div>
                </div>
                <div class="col-md-6 mb-3">
                    <label for="amount" class="form-label">Jumlah <span class="text-danger">*</span></label>
                    <div class="input-group">
                        <span class="input-group-text">Rp</span>
                        <input type="text" class="form-control" id="amount" name="amount" placeholder="0" required>
                    </div>
                    <div class="invalid-feedback" id="error-amount"></div>
                </div>
            </div>

            <div class="mb-3">
                <label for="description" class="form-label">Deskripsi / Catatan <span class="text-danger">*</span></label>
                <textarea class="form-control" id="description" name="description" rows="3" 
                          placeholder="Masukkan penjelasan tentang pengeluaran ini..." required></textarea>
                <div class="invalid-feedback" id="error-description"></div>
            </div>

            <div class="mb-3">
                <label for="attachment" class="form-label">Lampiran</label>
                <input type="file" class="form-control" id="attachment" name="attachment" 
                       accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx">
                <div class="form-text">Upload bukti pembayaran, kwitansi, atau dokumen pendukung</div>
                <div class="invalid-feedback" id="error-attachment"></div>
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
        history.pushState(null, "", "/expenses");
        window.dispatchEvent(new PopStateEvent("popstate"));
    });

    // Format input jumlah dengan thousand separator
    const amountInput = document.getElementById("amount");
    amountInput.addEventListener("input", function () {
        let value = unformatNumber(this.value);
        if (value) {
            this.value = formatNumber(value);
        }
    });

    const form = document.getElementById("expense-form");
    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        showLoader();

        const formData = new FormData(form);
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            // Simulasi proses submit (karena belum ada API)
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Format amount sebelum submit
            const amountValue = unformatNumber(formData.get("amount"));
            formData.set("amount", amountValue);

            const action = isEdit ? "diperbarui" : "ditambahkan";
            showToast(`Pengeluaran berhasil ${action}`);

            history.pushState(null, "", "/expenses");
            window.dispatchEvent(new PopStateEvent("popstate"));
        } catch (err) {
            showToast("Gagal menyimpan pengeluaran", "error");
        } finally {
            hideLoader();
            submitBtn.disabled = false;
        }
    });

    if (isEdit) {
        // Nanti load data dari API ketika expenseService sudah ready
        // expenseService.get(params.id).then(data => {
        //   for (let key in data) {
        //     const el = document.getElementById(key);
        //     if (el && el.type !== 'file') {
        //       el.value = data[key] ?? '';
        //     }
        //   }
        // });
    }

    hideLoader();
}
