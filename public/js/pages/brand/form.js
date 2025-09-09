import { renderHeader } from '../../components/header.js';
import { renderBreadcrumb } from '../../components/breadcrumb.js';
import { brandService } from '../../services/brandService.js';
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
  const title = isEdit ? 'Edit Brand' : 'Tambah Brand';

  target.innerHTML = "";
  renderHeader("header");
  renderBreadcrumb(
    target,
    isEdit ? `/brands/${params.id}/edit` : '/brands/create',
    labelOverride || title
  );

  target.innerHTML += `
    <form id="brand-form" class="bg-white p-4 rounded shadow-sm">
      ${formGroup('name', 'Nama Brand', 'text')}
      ${formGroup('slug', 'Slug (opsional)', 'text')}
      ${formGroup('website_url', 'Website URL', 'url')}
      ${formGroup('logo_path', 'Logo URL/Path', 'text')}

      <div class="mb-3">
        <label class="form-label d-block">Sosial Media</label>
        <div class="row g-2">
          <div class="col-md-4">
            <input id="socials_tiktok" name="socials_tiktok" class="form-control" placeholder="TikTok (mis. @brand)" />
          </div>
          <div class="col-md-4">
            <input id="socials_instagram" name="socials_instagram" class="form-control" placeholder="Instagram (mis. @brand.ig)" />
          </div>
          <div class="col-md-4">
            <input id="socials_youtube" name="socials_youtube" class="form-control" placeholder="YouTube (mis. Brand Channel)" />
          </div>
        </div>
        <div class="invalid-feedback d-block" id="error-socials"></div>
      </div>

      <div class="form-check form-switch mb-3">
        <input class="form-check-input" type="checkbox" id="is_active" name="is_active" checked>
        <label class="form-check-label" for="is_active">Aktif</label>
      </div>

      ${formTextarea('notes', 'Catatan')}

      <div class="d-flex gap-2 justify-content-end mt-4">
        <button type="button" class="btn btn-secondary" id="cancelBtn"><i class="bi bi-x-square"></i> Batal</button>
        <button type="submit" class="btn btn-primary"><i class="bi bi-save"></i> Simpan</button>
      </div>
    </form>
  `;

  // Cancel → balik ke list brands
  document.getElementById('cancelBtn').addEventListener('click', () => {
    history.pushState(null, '', '/brands');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  // Auto-slug dari name (kalau slug kosong / sama dengan hasil auto sebelumnya)
  const nameEl = document.getElementById('name');
  const slugEl = document.getElementById('slug');
  let lastAutoSlug = '';
  function slugify(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 160);
  }
  nameEl?.addEventListener('input', () => {
    const auto = slugify(nameEl.value);
    if (!slugEl.value || slugEl.value === lastAutoSlug) {
      slugEl.value = auto;
      lastAutoSlug = auto;
    }
  });

  // Submit
  document.getElementById('brand-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    showLoader();
    clearAllErrors();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    // Konstruksi FormData hanya dengan field sesuai schema
    const fd = new FormData();
    const name = (document.getElementById('name')?.value || '').trim();
    const slug = (document.getElementById('slug')?.value || '').trim();
    const website_url = (document.getElementById('website_url')?.value || '').trim();
    const logo_path = (document.getElementById('logo_path')?.value || '').trim();
    const notes = (document.getElementById('notes')?.value || '').trim();
    const is_active = document.getElementById('is_active')?.checked ? '1' : '0';

    // socials → JSON
    const socials = {
      tiktok: (document.getElementById('socials_tiktok')?.value || '').trim(),
      instagram: (document.getElementById('socials_instagram')?.value || '').trim(),
      youtube: (document.getElementById('socials_youtube')?.value || '').trim(),
    };
    // hapus key kosong
    Object.keys(socials).forEach(k => { if (!socials[k]) delete socials[k]; });

    fd.set('name', name);
    if (slug) fd.set('slug', slug);            // slug opsional; jika kosong akan di-autogen di backend
    if (website_url) fd.set('website_url', website_url);
    if (logo_path) fd.set('logo_path', logo_path);
    fd.set('is_active', is_active);
    if (Object.keys(socials).length > 0) fd.set('socials', JSON.stringify(socials));
    if (notes) fd.set('notes', notes);

    try {
      if (isEdit) {
        await brandService.update(params.id, fd);
        showToast('Brand berhasil diperbarui');
      } else {
        await brandService.create(fd);
        showToast('Brand berhasil ditambahkan');
      }

      history.pushState(null, '', '/brands');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      showToast('Gagal menyimpan brand.', 'error');
      if (err.errors) {
        // mapping error standar
        showValidationErrors(err.errors);

        // kalau error pada 'socials' (array) tampilkan manual
        if (err.errors.socials) {
          const el = document.getElementById('error-socials');
          if (el) el.textContent = Array.isArray(err.errors.socials) ? err.errors.socials.join(', ') : String(err.errors.socials);
        }
      }
    } finally {
      hideLoader();
      submitBtn.disabled = false;
    }
  });

  // Prefill saat edit
  if (isEdit) {
    brandService.get(params.id).then(data => {
      // field sederhana
      const fill = (id, val) => {
        const el = document.getElementById(id);
        if (el && el.type !== 'file') el.value = val ?? '';
      };

      fill('name', data.name);
      fill('slug', data.slug);
      fill('website_url', data.website_url);
      fill('logo_path', data.logo_path);
      fill('notes', data.notes);

      const activeEl = document.getElementById('is_active');
      if (activeEl) activeEl.checked = !!data.is_active;

      // socials object
      const s = data.socials || {};
      fill('socials_tiktok', s.tiktok);
      fill('socials_instagram', s.instagram);
      fill('socials_youtube', s.youtube);

      // catat auto-slug supaya tidak override manual
      lastAutoSlug = slugify(data.name || '');
    });
  }
}
