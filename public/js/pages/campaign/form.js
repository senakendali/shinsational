// campaigns/form.js
export async function render(target, params = {}, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();
  const isEdit = !!params.id;
  const title = isEdit ? 'Edit Campaign' : 'Tambah Campaign';

  const [
    { renderBreadcrumb },
    { renderHeader },
    { campaignService },
    { brandService },
    loaderMod,
    { showToast },
    formMod,
    numberMod
  ] = await Promise.all([
    import(`../../components/breadcrumb.js?v=${v}`),
    import(`../../components/header.js?v=${v}`),
    import(`../../services/campaignService.js?v=${v}`),
    import(`../../services/brandService.js?v=${v}`),
    import(`../../components/loader.js?v=${v}`),
    import(`../../utils/toast.js?v=${v}`),
    import(`../../utils/form.js?v=${v}`),
    import(`../../utils/number.js?v=${v}`)
  ]);

  const { showLoader, hideLoader } = loaderMod;
  const {
    formGroup,
    formTextarea,
    showValidationErrors,
    clearAllErrors
  } = formMod;
  const { formatNumber, unformatNumber } = numberMod;

  target.innerHTML = "";
  renderHeader("header");
  renderBreadcrumb(
    target,
    isEdit ? `/admin/campaigns/${params.id}/edit` : '/admin/campaigns/create',
    labelOverride || title
  );

  target.innerHTML += `
    <form id="campaign-form" class="bg-white p-4 rounded shadow-sm">
      <div class="row g-3">
        <div class="col-md-6">
          <label for="brand_id" class="form-label">Brand</label>
          <select id="brand_id" name="brand_id" class="form-select" required>
            <option value="">-- Pilih Brand --</option>
          </select>
          <div class="invalid-feedback d-block" id="error-brand_id"></div>
        </div>

        <div class="col-md-6">
          ${formGroup('code', 'Kode (opsional)', 'text')}
        </div>

        <div class="col-md-6">
          ${formGroup('name', 'Nama Campaign', 'text')}
        </div>
        <div class="col-md-6">
          ${formGroup('slug', 'Slug (opsional)', 'text')}
        </div>

        <div class="col-md-6">
          <label for="objective" class="form-label">Objective</label>
          <select id="objective" name="objective" class="form-select">
            <option value="">-- Pilih --</option>
            <option value="awareness">Awareness</option>
            <option value="engagement">Engagement</option>
            <option value="conversion">Conversion</option>
          </select>
        </div>

        <div class="col-md-3">
          ${formGroup('start_date', 'Mulai', 'date')}
        </div>
        <div class="col-md-3">
          ${formGroup('end_date', 'Selesai', 'date')}
        </div>

        <div class="col-md-6">
          <label for="status" class="form-label">Status</label>
          <select id="status" name="status" class="form-select">
            <option value="draft" selected>Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div class="col-md-3">
          <label class="form-label">Aktif</label>
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="is_active" name="is_active" checked>
            <label class="form-check-label" for="is_active">Aktif</label>
          </div>
        </div>

        <!-- Budget jadi TEXT agar bisa diformat 1.000.000 -->
        <div class="col-md-3">
          ${formGroup('budget', 'Budget', 'text')}
        </div>

        <div class="col-md-3">
          <label for="currency" class="form-label">Mata Uang</label>
          <select id="currency" name="currency" class="form-select">
            <option value="IDR" selected>IDR</option>
            <option value="USD">USD</option>
            <option value="SGD">SGD</option>
            <option value="MYR">MYR</option>
          </select>
        </div>

       

        <!-- NEW: Persyaratan KOL (usia) -->
        <div class="col-12">
          <div class="border rounded p-3">
            <div class="mb-2 fw-semibold">Persyaratan KOL</div>
            <div class="row g-3">
              <div class="col-md-3">
                <label class="form-label" for="min_age">Usia Minimal</label>
                <input id="min_age" name="min_age" type="number" min="0" class="form-control" placeholder="cth. 18">
                <div class="invalid-feedback d-block" id="error-min_age"></div>
              </div>
              <div class="col-md-3">
                <label class="form-label" for="max_age">Usia Maksimal</label>
                <input id="max_age" name="max_age" type="number" min="0" class="form-control" placeholder="cth. 35">
                <div class="invalid-feedback d-block" id="error-max_age"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- NEW: Kuota konten wajib (per campaign) -->
        <div class="col-12">
          <div class="border rounded p-3">
            <div class="mb-2 fw-semibold">Konten Wajib</div>
            <div class="row g-3">
              <div class="col-md-4">
                <label class="form-label" for="content_quota">Jumlah Konten Wajib Dibuat</label>
                <input id="content_quota" name="content_quota" type="text" class="form-control" placeholder="cth. 10">
                <small class="text-muted">Total minimal konten yang harus diproduksi dalam campaign ini.</small>
                <div class="invalid-feedback d-block" id="error-content_quota"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12">
          <div class="border rounded p-3">
            <div class="mb-2 fw-semibold">Target KPI (opsional)</div>
            <div class="row g-3">
              <!-- KPI juga TEXT agar bisa diformat 1.000 -->
              <div class="col-md-3">
                <label class="form-label">Views</label>
                <input id="kpi_views" type="text" class="form-control" placeholder="cth. 100.000">
              </div>
              <div class="col-md-3">
                <label class="form-label">Likes</label>
                <input id="kpi_likes" type="text" class="form-control" placeholder="cth. 5.000">
              </div>
              <div class="col-md-3">
                <label class="form-label">Comments</label>
                <input id="kpi_comments" type="text" class="form-control" placeholder="cth. 1.000">
              </div>
              <div class="col-md-3">
                <label class="form-label">Shares</label>
                <input id="kpi_shares" type="text" class="form-control" placeholder="cth. 500">
              </div>

              <!-- NEW: KPI Jumlah Konten Upload -->
              <div class="col-md-3 d-none">
                <label class="form-label">Konten Upload (KPI)</label>
                <input id="kpi_contents" type="text" class="form-control" placeholder="cth. 20">
                <small class="text-muted">Target jumlah postingan yang berhasil diunggah.</small>
              </div>
            </div>
            <div class="invalid-feedback d-block" id="error-kpi_targets"></div>
          </div>
        </div>

        <div class="col-12">
          <label class="form-label">Hashtags (pisahkan dengan koma)</label>
          <input id="hashtags" name="hashtags" class="form-control" placeholder="#promo, #ramadan, #brand">
          <small class="text-muted">Contoh: <code>#promo, #ramadan</code></small>
          <div class="invalid-feedback d-block" id="error-hashtags"></div>
        </div>

        <div class="col-12">
          ${formTextarea('notes', 'Catatan')}
        </div>
      </div>

      <div class="d-flex gap-2 justify-content-end mt-4">
        <button type="button" class="btn btn-secondary" id="cancelBtn"><i class="bi bi-x-square"></i> Batal</button>
        <button type="submit" class="btn btn-primary"><i class="bi bi-save"></i> Simpan</button>
      </div>
    </form>
  `;

  // Cancel → balik ke list
  document.getElementById('cancelBtn').addEventListener('click', () => {
    history.pushState(null, '', '/admin/campaigns');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  // Auto-slug
  const nameEl = document.getElementById('name');
  const slugEl = document.getElementById('slug');
  let lastAutoSlug = '';
  const slugify = (str) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 160);

  nameEl?.addEventListener('input', () => {
    const auto = slugify(nameEl.value);
    if (!slugEl.value || slugEl.value === lastAutoSlug) {
      slugEl.value = auto;
      lastAutoSlug = auto;
    }
  });

  // === Formatter ribuan untuk input text (budget & KPI) ===
  const attachThousandFormatter = (el) => {
    if (!el) return;
    const reformat = () => {
      const digits = unformatNumber(el.value || '');
      el.value = digits ? formatNumber(digits) : '';
    };
    el.addEventListener('input', reformat);
    el.addEventListener('blur', reformat);
    el.addEventListener('focus', () => { setTimeout(() => el.select(), 0); });
    // init
    reformat();
  };

  // Terapkan ke Budget + KPI
  attachThousandFormatter(document.getElementById('budget'));
  attachThousandFormatter(document.getElementById('kpi_views'));
  attachThousandFormatter(document.getElementById('kpi_likes'));
  attachThousandFormatter(document.getElementById('kpi_comments'));
  attachThousandFormatter(document.getElementById('kpi_shares'));
  // NEW: formatter untuk KPI Konten & Kuota Konten
  attachThousandFormatter(document.getElementById('kpi_contents'));
  attachThousandFormatter(document.getElementById('content_quota'));

  // Load brands ke dropdown
  async function populateBrands(selectedId = null) {
    try {
      const res = await brandService.getAll({ page: 1, per_page: 1000 });
      const brands = res.data || [];
      const sel = document.getElementById('brand_id');

      // Bangun option via DOM (lebih aman)
      sel.innerHTML = '';
      const ph = document.createElement('option');
      ph.value = '';
      ph.textContent = '-- Pilih Brand --';
      sel.appendChild(ph);

      brands.forEach(b => {
        const opt = document.createElement('option');
        opt.value = String(b.id);
        opt.textContent = b.name ?? `Brand #${b.id}`;
        sel.appendChild(opt);
      });

      if (selectedId) sel.value = String(selectedId);
    } catch (e) {
      showToast('Gagal memuat daftar brand', 'error');
    }
  }


  // Submit
  document.getElementById('campaign-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();
    clearAllErrors();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const fd = new FormData();
    const brand_id = document.getElementById('brand_id').value;
    const code = (document.getElementById('code')?.value || '').trim();
    const name = (document.getElementById('name')?.value || '').trim();
    const slug = (document.getElementById('slug')?.value || '').trim();
    const objective = (document.getElementById('objective')?.value || '').trim();
    const start_date = (document.getElementById('start_date')?.value || '').trim();
    const end_date = (document.getElementById('end_date')?.value || '').trim();
    const status = (document.getElementById('status')?.value || '').trim();
    const is_active = document.getElementById('is_active')?.checked ? '1' : '0';
    const budgetFormatted = (document.getElementById('budget')?.value || '').trim();
    const currency = (document.getElementById('currency')?.value || '').trim();
    const hashtagsRaw = (document.getElementById('hashtags')?.value || '').trim();
    const notes = (document.getElementById('notes')?.value || '').trim();

    // NEW: usia & kuota konten
    const min_age = (document.getElementById('min_age')?.value || '').trim();
    const max_age = (document.getElementById('max_age')?.value || '').trim();
    const content_quota_formatted = (document.getElementById('content_quota')?.value || '').trim();

    // KPI (ambil angka polos)
    const numFromField = (id) => {
      const f = (document.getElementById(id)?.value || '').trim();
      const digits = unformatNumber(f);
      return digits === '' ? null : Number(digits);
    };
    const kv = {
      views: numFromField('kpi_views'),
      likes: numFromField('kpi_likes'),
      comments: numFromField('kpi_comments'),
      shares: numFromField('kpi_shares'),
      // NEW: KPI jumlah konten upload
      contents: numFromField('kpi_contents')
    };
    const kpi = {};
    Object.entries(kv).forEach(([k, val]) => { if (val != null && !Number.isNaN(val)) kpi[k] = val; });

    // Hashtags → array
    let tags = [];
    if (hashtagsRaw) {
      tags = hashtagsRaw.split(',').map(s => s.trim()).filter(Boolean);
    }

    // Build FormData
    fd.set('brand_id', brand_id);
    if (code) fd.set('code', code);
    fd.set('name', name);
    if (slug) fd.set('slug', slug);
    if (objective) fd.set('objective', objective);
    if (start_date) fd.set('start_date', start_date);
    if (end_date) fd.set('end_date', end_date);
    if (status) fd.set('status', status);
    fd.set('is_active', is_active);

    // Budget: angka polos
    if (budgetFormatted) {
      const digits = unformatNumber(budgetFormatted); // "1.200.000" -> "1200000"
      if (digits) fd.set('budget', digits);
    }

    if (currency) fd.set('currency', currency);

    // NEW: usia & kuota konten (angka polos)
    if (min_age) fd.set('min_age', String(Math.max(0, Number(min_age))));
    if (max_age) fd.set('max_age', String(Math.max(0, Number(max_age))));
    if (content_quota_formatted) {
      const cqDigits = unformatNumber(content_quota_formatted);
      if (cqDigits) fd.set('content_quota', cqDigits);
    }

    if (Object.keys(kpi).length) fd.set('kpi_targets', JSON.stringify(kpi));
    if (tags.length) fd.set('hashtags', JSON.stringify(tags));
    if (notes) fd.set('notes', notes);

    try {
      if (isEdit) {
        await campaignService.update(params.id, fd);
        showToast('Campaign berhasil diperbarui');
      } else {
        await campaignService.create(fd);
        showToast('Campaign berhasil ditambahkan');
      }
      history.pushState(null, '', '/admin/campaigns');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      showToast('Gagal menyimpan campaign.', 'error');
      if (err?.errors) {
        showValidationErrors(err.errors);
        if (err.errors.brand_id) document.getElementById('error-brand_id').textContent = Array.isArray(err.errors.brand_id) ? err.errors.brand_id.join(', ') : String(err.errors.brand_id);
        if (err.errors.kpi_targets) document.getElementById('error-kpi_targets').textContent = Array.isArray(err.errors.kpi_targets) ? err.errors.kpi_targets.join(', ') : String(err.errors.kpi_targets);
        if (err.errors.hashtags) document.getElementById('error-hashtags').textContent = Array.isArray(err.errors.hashtags) ? err.errors.hashtags.join(', ') : String(err.errors.hashtags);
        // NEW: tampilkan error usia & quota
        if (err.errors.min_age) document.getElementById('error-min_age').textContent = Array.isArray(err.errors.min_age) ? err.errors.min_age.join(', ') : String(err.errors.min_age);
        if (err.errors.max_age) document.getElementById('error-max_age').textContent = Array.isArray(err.errors.max_age) ? err.errors.max_age.join(', ') : String(err.errors.max_age);
        if (err.errors.content_quota) document.getElementById('error-content_quota').textContent = Array.isArray(err.errors.content_quota) ? err.errors.content_quota.join(', ') : String(err.errors.content_quota);
      }
    } finally {
      hideLoader();
      submitBtn.disabled = false;
    }
  });

  // Prefill edit / populate brands
  showLoader();
  if (isEdit) {
    try {
      const [data, brandsRes] = await Promise.all([
        campaignService.get(params.id),
        brandService.getAll({ page: 1, per_page: 1000 })
      ]);

      // brands
      
      const brands = brandsRes?.data || [];
      
      const sel = document.getElementById('brand_id');
      sel.innerHTML = '';
      const ph = document.createElement('option');
      ph.value = '';
      ph.textContent = '-- Pilih Brand --';
      sel.appendChild(ph);

      (brandsRes?.data || []).forEach(b => {
        const opt = document.createElement('option');
        opt.value = String(b.id);
        opt.textContent = b.name ?? `Brand #${b.id}`;
        sel.appendChild(opt);
      });

      sel.value = String(data.brand_id);


      // fields
      const set = (id, v) => { const el = document.getElementById(id); if (el && el.type !== 'file') el.value = v ?? ''; };
      set('code', data.code);
      set('name', data.name);
      set('slug', data.slug);
      set('objective', data.objective);
      set('start_date', data.start_date);
      set('end_date', data.end_date);
      set('status', data.status || 'draft');
      const activeEl = document.getElementById('is_active'); if (activeEl) activeEl.checked = !!data.is_active;
      set('currency', data.currency || 'IDR');
      set('notes', data.notes);

      // NEW: usia + kuota konten
      set('min_age', data.min_age);
      set('max_age', data.max_age);
      const cqEl = document.getElementById('content_quota');
      if (cqEl) cqEl.value = (data.content_quota == null || data.content_quota === '') ? '' : formatNumber(String(Math.trunc(Number(data.content_quota))));

      // budget → format ribuan (integer)
      const budgetVal = (data.budget != null && data.budget !== '') ? Math.trunc(Number(data.budget)) : '';
      const budgetEl = document.getElementById('budget');
      budgetEl.value = budgetVal === '' ? '' : formatNumber(String(budgetVal));

      // KPI → format ribuan
      const kt = data.kpi_targets || {};
      const fmt = (n) => (n == null || n === '' ? '' : formatNumber(String(Math.trunc(Number(n)))));
      document.getElementById('kpi_views').value = fmt(kt.views);
      document.getElementById('kpi_likes').value = fmt(kt.likes);
      document.getElementById('kpi_comments').value = fmt(kt.comments);
      document.getElementById('kpi_shares').value = fmt(kt.shares);
      // NEW: KPI contents
      const kpiContentsEl = document.getElementById('kpi_contents');
      if (kpiContentsEl) kpiContentsEl.value = fmt(kt.contents);

      // hashtags
      const tags = Array.isArray(data.hashtags) ? data.hashtags.join(', ') : '';
      document.getElementById('hashtags').value = tags;

      // protect auto-slug
      lastAutoSlug = slugify(data.name || '');

      // re-attach formatter setelah prefill (jaga-jaga)
      attachThousandFormatter(budgetEl);
      attachThousandFormatter(document.getElementById('kpi_views'));
      attachThousandFormatter(document.getElementById('kpi_likes'));
      attachThousandFormatter(document.getElementById('kpi_comments'));
      attachThousandFormatter(document.getElementById('kpi_shares'));
      // NEW:
      attachThousandFormatter(kpiContentsEl);
      attachThousandFormatter(cqEl);
    } catch (e) {
      await populateBrands();
      showToast('Gagal memuat data campaign/brand', 'error');
    } finally {
      hideLoader();
    }
  } else {
    await populateBrands();
    hideLoader();
  }
}
