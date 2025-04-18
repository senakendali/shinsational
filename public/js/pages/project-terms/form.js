import { renderBreadcrumb } from '../../components/breadcrumb.js';
import { projectTermService } from '../../services/projectTermService.js';
import { projectService } from '../../services/projectService.js';
import { showLoader, hideLoader } from '../../components/loader.js';
import { showToast } from '../../utils/toast.js';
import {
  formGroup,
  formTextarea,
  formSelect,
  showValidationErrors,
  clearAllErrors
} from '../../utils/form.js';
import { formatNumber, unformatNumber } from '../../utils/number.js';

export async function render(target, params = {}, query = {}, labelOverride = null) {
  const isEdit = !!params.id;

  target.innerHTML = '';
  renderBreadcrumb(target, `/project-terms${isEdit ? `/${params.id}/edit` : '/create'}`, labelOverride);
  showLoader();

  let projectOptions = '';
  try {
    const projects = await projectService.getAll();
    projectOptions = projects.data.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  } catch (err) {
    showToast('Gagal memuat daftar proyek', 'error');
    hideLoader();
    return;
  }

  target.innerHTML += `
    <form id="term-form" class="bg-white p-4 rounded shadow-sm">
      <div class="mb-3">
        <label for="project_id" class="form-label">Pilih Proyek</label>
        <select class="form-select" id="project_id" name="project_id" required>
          <option value="">-- Pilih Proyek --</option>
          ${projectOptions}
        </select>
        <div class="invalid-feedback" id="error-project_id"></div>
      </div>

      ${formGroup('title', 'Judul Termin', 'text')}
      ${formTextarea('description', 'Deskripsi')}
      ${formGroup('amount', 'Jumlah Tagihan', 'text')} <!-- ganti jadi text untuk bisa format -->
      ${formGroup('due_date', 'Tanggal Jatuh Tempo', 'date')}
      ${formSelect('status', 'Status Pembayaran', ['belum_dibayar', 'dibayar'])}
      ${formGroup('paid_at', 'Tanggal Dibayar (jika sudah)', 'date')}

      <div class="d-flex justify-content-between mt-4">
        <button type="submit" class="btn btn-primary"><i class="bi bi-save"></i> Simpan</button>
        <button type="button" class="btn btn-secondary" id="cancelBtn"><i class="bi bi-x-square"></i> Batal</button>
      </div>
    </form>
  `;

  document.getElementById('cancelBtn').addEventListener('click', () => {
    history.pushState(null, '', `/project-terms`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  // Format input amount
  const amountInput = document.getElementById('amount');
  amountInput.addEventListener('input', function () {
    let raw = unformatNumber(this.value);
    if (isNaN(raw)) raw = '0';

    // Hindari negatif
    if (Number(raw) < 0) raw = '0';

    this.value = 'Rp ' + formatNumber(raw);
  });

  document.getElementById('term-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    showLoader();
    clearAllErrors();

    // Unformat sebelum kirim
    const rawAmount = unformatNumber(amountInput.value);
    amountInput.value = rawAmount;

    const form = e.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      if (isEdit) {
        await projectTermService.update(params.id, formData);
        showToast('Termin berhasil diperbarui');
      } else {
        await projectTermService.create(formData);
        showToast('Termin berhasil ditambahkan');
      }

      history.pushState(null, '', `/project-terms`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      showToast('Gagal menyimpan termin.', 'error');
      if (err.errors) showValidationErrors(err.errors);
    } finally {
      hideLoader();
      submitBtn.disabled = false;
    }
  });

  // Populate saat edit
  if (isEdit) {
    projectTermService.get(params.id).then(data => {
      for (let key in data) {
        const el = document.getElementById(key);
        if (el && el.type !== 'file') {
          el.value = key === 'amount' ? 'Rp ' + formatNumber(data[key]) : (data[key] ?? '');
        }
      }
      hideLoader();
    });
  } else {
    hideLoader();
  }
}
