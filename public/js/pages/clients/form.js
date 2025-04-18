import { renderBreadcrumb } from '../../components/breadcrumb.js';
import { clientService } from '../../services/clientService.js';
import { showLoader, hideLoader } from '../../components/loader.js';
import { showToast } from '../../utils/toast.js';
import {
  formGroup,
  formTextarea,
  showValidationErrors,
  clearAllErrors
} from '../../utils/form.js';

export function render(target, params = {}, query = {}, labelOverride = null) {
  const isEdit = !!params.id;
  const title = isEdit ? 'Edit Klien' : 'Tambah Klien Baru';

  target.innerHTML = "";
  renderBreadcrumb(
    target,
    isEdit ? `/clients/${params.id}/edit` : '/clients/create',
    labelOverride
  );
  

  target.innerHTML += `
    <form id="client-form" class="bg-white p-4 rounded shadow-sm">
      ${formGroup('name', 'Nama Klien', 'text')}
      ${formGroup('email', 'Email', 'email')}
      ${formGroup('phone', 'Nomor HP', 'text')}
      ${formTextarea('address', 'Alamat')}
      ${formGroup('pic_name', 'Nama PIC', 'text')}
      ${formGroup('pic_email', 'Email PIC', 'email')}
      ${formGroup('pic_phone', 'Nomor HP PIC', 'text')}
      ${formGroup('pic_position', 'Jabatan PIC', 'text')}
      ${formTextarea('notes', 'Catatan')}

      <div class="d-flex justify-content-between mt-4">
        <button type="submit" class="btn btn-primary"><i class="bi bi-save"></i> Simpan</button>
        <button type="button" class="btn btn-secondary" id="cancelBtn"><i class="bi bi-x-square"></i> Batal</button>
      </div>
    </form>
  `;

  document.getElementById('cancelBtn').addEventListener('click', () => {
    history.pushState(null, '', '/clients');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  document.getElementById('client-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    showLoader();
    clearAllErrors();

    const form = e.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      if (isEdit) {
        await clientService.update(params.id, formData);
        showToast('Klien berhasil diperbarui');
      } else {
        await clientService.create(formData);
        showToast('Klien berhasil ditambahkan');
      }

      history.pushState(null, '', '/clients');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      showToast('Gagal menyimpan klien.', 'error');
      if (err.errors) showValidationErrors(err.errors);
    } finally {
      hideLoader();
      submitBtn.disabled = false;
    }
  });

  if (isEdit) {
    clientService.get(params.id).then(data => {
      for (let key in data) {
        const el = document.getElementById(key);
        if (el && el.type !== 'file') {
          el.value = data[key] ?? '';
        }
      }
    });
  }
}
