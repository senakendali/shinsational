// /js/pages/admin/kols/form.js
export async function render(target, params = {}, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();
  const isEdit = !!params.id;
  const title = labelOverride || (isEdit ? 'Edit KOL' : 'Tambah KOL');

  const [
    { renderHeader },
    { renderBreadcrumb },
    { showToast },
    loaderMod,
    formMod,
    campaignMod,
    serviceMod,
  ] = await Promise.all([
    import(`../../components/header.js?v=${v}`),
    import(`../../components/breadcrumb.js?v=${v}`),
    import(`../../utils/toast.js?v=${v}`),
    import(`../../components/loader.js?v=${v}`),
    import(`../../utils/form.js?v=${v}`),
    import(`../../services/campaignService.js?v=${v}`),
    import(`../../services/influencerRegistrationService.js?v=${v}`),
  ]);

  const { showLoader, hideLoader } = loaderMod;
  const { formGroup, showValidationErrors, clearAllErrors } = formMod;
  const { campaignService } = campaignMod;
  const { influencerService } = serviceMod;

  const $ = (s) => document.querySelector(s);

  const normalizeHandle = (val) => (val || '').toString().trim().replace(/^@+/, '');
  const makePseudoId = (handle) => {
    const h = normalizeHandle(handle).toLowerCase();
    return h ? `pseudo_${h}` : '';
  };

  // Normalisasi berbagai format date → YYYY-MM-DD (buat <input type="date">)
  function toDateInputValue(v) {
    if (!v) return '';
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return '';
    // konversi ke local date component
    const tzOffMin = d.getTimezoneOffset();
    const local = new Date(d.getTime() - tzOffMin * 60000);
    return local.toISOString().slice(0, 10);
  }

  target.innerHTML = '';
  showLoader();

  renderHeader('header');
  renderBreadcrumb(
    target,
    isEdit ? `/admin/kols/${params.id}/edit` : '/admin/kols/create',
    title
  );

  // Ambil campaign untuk select
  let campaigns = [];
  try {
    const c = await campaignService.getAll({ page: 1, per_page: 200, status: '' });
    campaigns = c?.data || [];
  } catch (_) {}

  const presetCampaignId =
    query?.campaign_id || new URL(location.href).searchParams.get('campaign_id') || '';

  const campaignOptions = [
    `<option value="">— Pilih Campaign —</option>`,
    ...campaigns.map(c => `<option value="${c.id}">${c.name}</option>`)
  ].join('');

  target.innerHTML += `
    <form id="kol-form" class="bg-white p-4 rounded shadow-sm">
      <div class="row g-3">
        <div class="col-md-6">
          ${formGroup('full_name', 'Full Name', 'text')}
        </div>
        <div class="col-md-6">
          ${formGroup('tiktok_username', 'TikTok Username (tanpa @)', 'text')}
        </div>

        <div class="col-md-6">
          ${formGroup('phone', 'Phone', 'tel')}
        </div>
        <div class="col-md-6">
          ${formGroup('email', 'Email', 'email')}
        </div>

        <div class="col-md-6">
          ${formGroup('birth_date', 'Birth Date', 'date')}
        </div>
        <div class="col-md-6">
          <label for="gender" class="form-label">Gender</label>
          <select id="gender" name="gender" class="form-select">
            <option value="">—</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <div class="invalid-feedback d-block" data-error-for="gender"></div>
        </div>

        <div class="col-12">
          <label for="address" class="form-label">Address</label>
          <textarea id="address" name="address" class="form-control" rows="2"></textarea>
          <div class="invalid-feedback d-block" data-error-for="address"></div>
        </div>

        <div class="col-md-4">
          ${formGroup('followers_count', 'Followers (angka)', 'number')}
        </div>

        <div class="col-md-8">
          <label for="campaign_id" class="form-label">Campaign</label>
          <select id="campaign_id" name="campaign_id" class="form-select">
            ${campaignOptions}
          </select>
          <div class="invalid-feedback d-block" data-error-for="campaign_id"></div>
        </div>
      </div>

      <div class="d-flex gap-2 justify-content-end mt-4">
        <button type="button" class="btn btn-secondary" id="cancelBtn">
          <i class="bi bi-x-square"></i> Batal
        </button>
        <button type="submit" class="btn btn-primary">
          <i class="bi bi-save"></i> Simpan
        </button>
      </div>
    </form>
  `;

  // Prefill campaign select (dari query)
  if (presetCampaignId) {
    const sel = $('#campaign_id');
    if (sel && sel.querySelector(`option[value="${presetCampaignId}"]`)) {
      sel.value = presetCampaignId;
    }
  }

  // Cancel → balik ke list KOL data dengan campaign filter tetap
  $('#cancelBtn')?.addEventListener('click', () => {
    const cid = $('#campaign_id')?.value || presetCampaignId || '';
    const qs = new URLSearchParams();
    if (cid) qs.set('campaign_id', cid);
    history.pushState(null, '', '/admin/kol' + (qs.toString() ? `?${qs}` : ''));
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  // ===== Prefill saat EDIT =====
  let loadedCampaignIdForBack = presetCampaignId || '';
  if (isEdit) {
    try {
      const reg = await influencerService.get(params.id); // pastikan service.get() return data lengkap

      const fill = (id, val) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (id === 'birth_date') el.value = toDateInputValue(val);
        else el.value = val ?? '';
      };

      fill('full_name', reg.full_name);
      fill('tiktok_username', normalizeHandle(reg.tiktok_username));
      fill('phone', reg.phone);
      fill('email', reg.email);
      fill('address', reg.address);
      fill('birth_date', reg.birth_date);
      // gender
      const gEl = document.getElementById('gender');
      if (gEl) gEl.value = (reg.gender || '').toLowerCase();
      // followers
      fill('followers_count', reg.followers_count != null ? String(reg.followers_count) : '');
      // campaign
      const cSel = document.getElementById('campaign_id');
      if (cSel && reg.campaign_id && cSel.querySelector(`option[value="${reg.campaign_id}"]`)) {
        cSel.value = String(reg.campaign_id);
        loadedCampaignIdForBack = String(reg.campaign_id);
      }
    } catch (e) {
      showToast('Gagal memuat data KOL.', 'error');
    }
  }

  // ===== Submit (Create/Update) =====
  $('#kol-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();
    clearAllErrors();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const full_name = ($('#full_name')?.value || '').trim();
    const tiktok_username = normalizeHandle($('#tiktok_username')?.value || '');
    const phone = ($('#phone')?.value || '').trim();
    const email = ($('#email')?.value || '').trim();
    const birth_date = ($('#birth_date')?.value || '').trim(); // sudah format YYYY-MM-DD
    const gender = ($('#gender')?.value || '').trim();
    const address = ($('#address')?.value || '').trim();
    const followers_count_raw = $('#followers_count')?.value;
    const followers_count = followers_count_raw === '' ? '' : String(Number(followers_count_raw) || 0);
    const campaign_id = ($('#campaign_id')?.value || '').trim();

    try {
      if (isEdit) {
        // Update pakai JSON (service.update mendukung PATCH/PUT json)
        const payload = {
          full_name,
          tiktok_username,
          phone,
          email,
          birth_date: birth_date || null,
          gender,
          address,
          followers_count: followers_count === '' ? null : Number(followers_count),
          campaign_id: campaign_id || null,
        };
        await influencerService.update(params.id, payload);
        showToast('KOL berhasil diperbarui.');
      } else {
        // Create: FormData (ikut service.create)
        const tiktok_user_id = makePseudoId(tiktok_username); // pseudo open_id utk mode manual
        const fd = new FormData();
        Object.entries({
          full_name,
          tiktok_username,
          phone,
          email,
          birth_date,
          gender,
          address,
          followers_count,
          campaign_id,
          tiktok_user_id,
          profile_pic_url: '', // opsional
        }).forEach(([k, v]) => fd.append(k, v ?? ''));
        await influencerService.create(fd);
        showToast('KOL berhasil ditambahkan.');
      }

      const backCampaign = campaign_id || loadedCampaignIdForBack || '';
      const qs = new URLSearchParams();
      if (backCampaign) qs.set('campaign_id', backCampaign);
      history.pushState(null, '', '/admin/kol' + (qs.toString() ? `?${qs}` : ''));
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      showToast(err?.message || (isEdit ? 'Gagal memperbarui KOL.' : 'Gagal menyimpan KOL.'), 'error');
      if (err?.errors) showValidationErrors(err.errors);
    } finally {
      hideLoader();
      submitBtn.disabled = false;
    }
  });

  hideLoader();
}
