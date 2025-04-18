import { renderBreadcrumb } from '../../components/breadcrumb.js';
import { projectService } from '../../services/projectService.js';
import { showLoader, hideLoader } from '../../components/loader.js';
import { showToast } from '../../utils/toast.js';
import { clientService } from '../../services/clientService.js';
import {
  formGroup,
  formTextarea,
  formSelect,
  showValidationErrors,
  clearAllErrors
} from '../../utils/form.js';

export async function render(target, params = {}, query = {}, labelOverride = null) {
  const isEdit = !!params.id;
  const title = isEdit ? 'Edit Proyek' : 'Tambah Proyek Baru';

  target.innerHTML = "";
  renderBreadcrumb(target, isEdit ? `/projects/${params.id}/edit` : '/projects/create', labelOverride);

  showLoader();

  const response = await clientService.getAll({ per_page: 1000 });
  const clients = response.data || [];

  const clientOptions = clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  target.innerHTML += `
    <form id="project-form" class="bg-white p-4 rounded shadow-sm">
      ${formGroup('name', 'Nama Proyek', 'text')}
      <div class="mb-3">
        <label for="client_id" class="form-label">Pilih Klien</label>
        <select class="form-select" id="client_id" name="client_id" required>
          <option value="">-- Pilih Klien --</option>
          ${clientOptions}
        </select>
        <div class="invalid-feedback" id="error-client_id"></div>
      </div>
      ${formGroup('start_date', 'Tanggal Mulai', 'date')}
      ${formGroup('end_date', 'Tanggal Selesai', 'date')}
      ${formSelect('status', 'Status', ['pending', 'berjalan', 'selesai', 'batal'])}
      ${formTextarea('description', 'Deskripsi')}
      ${formTextarea('notes', 'Catatan')}

      <div class="d-flex justify-content-between mt-4">
        <button type="submit" class="btn btn-primary"><i class="bi bi-save"></i> Simpan</button>
        <button type="button" class="btn btn-secondary" id="cancelBtn"><i class="bi bi-x-square"></i> Batal</button>
      </div>
    </form>
  `;

  document.getElementById('cancelBtn').addEventListener('click', () => {
    history.pushState(null, '', '/projects');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  document.getElementById('project-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    showLoader();
    clearAllErrors();

    const form = e.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      if (isEdit) {
        await projectService.update(params.id, formData);
        showToast('Proyek berhasil diperbarui');
      } else {
        await projectService.create(formData);
        showToast('Proyek berhasil ditambahkan');
      }

      history.pushState(null, '', '/projects');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      showToast('Gagal menyimpan proyek.', 'error');
      if (err.errors) showValidationErrors(err.errors);
    } finally {
      hideLoader();
      submitBtn.disabled = false;
    }
  });

  if (isEdit) {
    projectService.get(params.id).then(data => {
      for (let key in data) {
        const el = document.getElementById(key);
        if (el && el.type !== 'file') {
          el.value = data[key] ?? '';
        }
      }

      // auto-select klien di dropdown
      const selectedClient = document.getElementById('client_id');
      if (selectedClient && data.client_id) {
        selectedClient.value = data.client_id;
      }

      hideLoader();
    });
  } else {
    hideLoader();
  }
}
