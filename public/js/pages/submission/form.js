// /js/pages/admin/submissions/form.js
export async function render(target, params = {}, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();
  const isEdit = !!params.id;
  const title = isEdit ? 'Edit Submission' : 'Tambah Submission';

  const [
    { renderHeader },
    { renderBreadcrumb },
    loaderMod,
    { showToast },
    subSvcMod
  ] = await Promise.all([
    import(`../../components/header.js?v=${v}`),
    import(`../../components/breadcrumb.js?v=${v}`),
    import(`../../components/loader.js?v=${v}`),
    import(`../../utils/toast.js?v=${v}`),
    import(`../../services/influencerSubmissionService.js?v=${v}`).catch(() => ({})),
  ]);

  const { showLoader, hideLoader } = loaderMod;
  const { submissionService } = subSvcMod || {};

  target.innerHTML = '';
  showLoader();
  renderHeader('header');
  renderBreadcrumb(
    target,
    isEdit ? `/admin/submissions/${params.id}/edit` : '/admin/submissions/create',
    labelOverride || title
  );

  // ====== TEMPLATE ======
  target.innerHTML += `
    <form id="adminSubmissionForm" class="bg-white p-4 rounded shadow-sm needs-validation" novalidate>
      <h5 class="mb-4">${title}</h5>

      <!-- Info KOL -->
      <div id="kolInfo" class="alert alert-light border d-none mb-4">
        <div class="row w-100 g-3 align-items-center">
          <div class="col-md d-flex align-items-center gap-3">
            <div class="position-relative" style="width:56px; height:56px;">
              <i id="kolAvatarIcon" class="bi bi-person-circle" style="font-size:56px; line-height:56px;"></i>
              <img id="kolAvatarImg" src="" alt="Avatar"
                  class="d-none rounded-circle position-absolute top-50 start-50 translate-middle"
                  style="width:56px; height:56px; object-fit:cover; border:2px solid #fff;" />
            </div>
            <div class="flex-grow-1">
              <div class="fw-semibold" id="kolName">Creator</div>
              <div class="text-muted small" id="kolHandle"></div>
            </div>
          </div>
          <div class="col-md-auto">
            <div class="small">
              <div class="mb-1">
                <i class="bi bi-telephone me-1"></i>
                <a id="kolPhone" class="text-decoration-none text-reset" href="javascript:void(0)">—</a>
              </div>
              <div class="mb-1">
                <i class="bi bi-envelope me-1"></i>
                <a id="kolEmail" class="text-decoration-none text-reset" href="javascript:void(0)">—</a>
              </div>
              <div class="mb-0">
                <i class="bi bi-geo-alt me-1"></i>
                <span id="kolAddress" class="text-break">—</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Content Slots -->
      <div class="mb-3 d-flex justify-content-between align-items-center">
        <h6 class="mb-0">Konten</h6>
        <button type="button" id="addSlotBtn" class="btn btn-sm btn-outline-primary">
          <i class="bi bi-plus-lg"></i> Tambah Link Postingan
        </button>
      </div>

      <div id="contentSlots" class="d-flex flex-column gap-4">
        ${[1,2,3,4,5].map(i => `
          <div class="slot card ${i<=2 ? '' : 'd-none'}" data-slot="${i}">
            <div class="card-body">
              <div class="row g-3 align-items-end">
                <div class="col-md-4">
                  <label for="link-${i}" class="form-label text-muted">Link Postingan ${i}</label>
                  <input type="url" class="form-control" id="link-${i}" placeholder="https://www.tiktok.com/...">
                  <div class="invalid-feedback">Harus URL yang valid.</div>
                </div>
                <div class="col-md-4">
                  <label for="post_date_${i}" class="form-label text-muted">Tanggal Postingan</label>
                  <input type="date" class="form-control" id="post_date_${i}">
                  <div class="invalid-feedback">Pilih tanggal yang valid.</div>
                </div>
                <div class="col-md-4">
                  <label for="screenshot_${i}" class="form-label text-muted">Screenshot Postingan</label>
                  <input type="file" class="form-control" id="screenshot_${i}" accept="image/*">
                  <a id="screenshot_${i}_view" href="#" target="_blank" rel="noopener noreferrer"
                    class="btn btn-outline-secondary btn-sm mt-2 d-none">Lihat Gambar</a>
                </div>
              </div>

              <!-- METRICS -->
              <div class="row g-3 mt-1">
                <div class="col-md-3">
                  <label for="views_${i}" class="form-label text-muted">Views</label>
                  <input type="number" min="0" step="1" class="form-control" id="views_${i}" placeholder="0">
                  <div class="invalid-feedback">Isi angka ≥ 0.</div>
                </div>
                <div class="col-md-3">
                  <label for="likes_${i}" class="form-label text-muted">Likes</label>
                  <input type="number" min="0" step="1" class="form-control" id="likes_${i}" placeholder="0">
                  <div class="invalid-feedback">Isi angka ≥ 0.</div>
                </div>
                <div class="col-md-3">
                  <label for="comments_${i}" class="form-label text-muted">Comments</label>
                  <input type="number" min="0" step="1" class="form-control" id="comments_${i}" placeholder="0">
                  <div class="invalid-feedback">Isi angka ≥ 0.</div>
                </div>
                <div class="col-md-3">
                  <label for="shares_${i}" class="form-label text-muted">Shares</label>
                  <input type="number" min="0" step="1" class="form-control" id="shares_${i}" placeholder="0">
                  <div class="invalid-feedback">Isi angka ≥ 0.</div>
                </div>
              </div>

              <div class="d-flex justify-content-end align-items-center mt-3">
                ${i>2 ? `
                <button type="button" class="btn btn-sm btn-outline-danger btn-remove-slot" data-slot="${i}">
                  <i class="bi bi-x-lg"></i> Hapus
                </button>` : ``}
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Acquisition -->
      <div class="mt-4">
        <div class="row g-3">
          <div class="col-md-6">
            <label for="acquisition_method" class="form-label text-muted">Cara Mendapatkan Produk</label>
            <select id="acquisition_method" class="form-select">
              <option value="">-- Pilih --</option>
              <option value="buy">Beli sendiri</option>
              <option value="sent_by_brand">Dikirim oleh Brand</option>
            </select>
          </div>
        </div>

        <!-- BUY -->
        <div id="purchaseFields" class="row g-3 mt-1 d-none">
          <div class="col-md-6">
            <label for="purchase_platform" class="form-label text-muted">Beli di mana</label>
            <select id="purchase_platform" class="form-select">
              <option value="">-- Pilih --</option>
              <option value="tiktokshop">TikTok Shop</option>
              <option value="shopee">Shopee</option>
            </select>
          </div>
          <div class="col-md-6">
            <label for="purchase_price" class="form-label text-muted">Harga Beli</label>
            <input type="number" min="0" step="0.01" class="form-control" id="purchase_price" placeholder="0">
          </div>
          <div class="col-md-6">
            <label for="invoice_file" class="form-label text-muted">Upload Invoice Pembelian</label>
            <input type="file" class="form-control" id="invoice_file" accept="application/pdf,image/*">
            <small class="text-muted">PDF/JPG/PNG</small>
            <a id="invoice_file_view" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-sm mt-2 d-none">Lihat File</a>
          </div>
        </div>

        <!-- SENT BY BRAND -->
        <div id="shippingFields" class="row g-3 mt-1 d-none">
          <div class="col-md-6">
            <label for="shipping_courier" class="form-label text-muted">Nama Ekspedisi</label>
            <input type="text" class="form-control" id="shipping_courier" placeholder="JNE / J&T / Sicepat / dsb">
          </div>
          <div class="col-md-6">
            <label for="shipping_tracking_number" class="form-label text-muted">Nomor Resi</label>
            <input type="text" class="form-control" id="shipping_tracking_number" placeholder="XXXXXXXXXXXX">
          </div>
        </div>
      </div>

      <!-- Review Proof -->
      <div class="row g-3 mt-2">
        <div class="col-md-6">
          <label for="review_proof_file" class="form-label text-muted">Upload Bukti Review/Rate</label>
          <input type="file" class="form-control" id="review_proof_file" accept="application/pdf,image/*">
          <small class="text-muted">PDF/JPG/PNG, opsional</small>
          <a id="review_proof_file_view" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-sm mt-2 d-none">Lihat File</a>
        </div>
      </div>

      <div class="col-12 pt-3 d-flex justify-content-end gap-2">
        <button type="button" class="btn btn-secondary" id="cancelBtn"><i class="bi bi-x-square"></i> Batal</button>
        <button type="submit" class="btn btn-primary px-4" id="saveBtn"><i class="bi bi-save"></i> Simpan</button>
      </div>
    </form>
  `;

  // ===== Helpers
  const $ = (sel) => document.querySelector(sel);
  const hasVal = (v) => v !== undefined && v !== null && String(v).trim() !== '';
  const safe = (v, d = '') => (v == null ? d : v);

  const toInputDate = (val) => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d)) return String(val).slice(0,10);
    const k = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return k.toISOString().slice(0,10);
  };

  // Viewer url: /files?p=...
  const toFileUrl = (input) => {
    if (!input) return '';
    const origin = location.origin;
    let raw = String(input).trim();

    if (/^https?:\/\//i.test(raw)) {
      try {
        const u = new URL(raw);
        if (u.origin === origin && /^\/?storage\//i.test(u.pathname)) {
          const stripped = u.pathname.replace(/^\/?storage\/?/i, '');
          return `${origin}/files?p=${encodeURIComponent(stripped)}`;
        }
        return raw;
      } catch {}
    }
    const normalized = raw.replace(/^\/+/, '').replace(/^storage\/+/i, '');
    return `${origin}/files?p=${encodeURIComponent(normalized)}`;
  };

  const getFileUrl = (rec, key) => {
    if (!rec) return '';
    const candidates = [
      `${key}_url`, `${key}`,
      key.replace('_',''),
      `${key}Url`, `${key}URL`,
      `${key}_path`, `${key}Path`,
    ];
    for (const k of candidates) {
      if (hasVal(rec?.[k])) return toFileUrl(rec[k]);
    }
    if (rec?.files && hasVal(rec.files[key])) return toFileUrl(rec.files[key]);
    return '';
  };

  // Avatar helpers (untuk <img src>)
  const toImageSrc = (raw) => {
    if (!hasVal(raw)) return '';
    const s = String(raw).trim();
    if (/^(https?:\/\/|data:image)/i.test(s)) return s;
    let path = s.replace(/^\/+/, '');
    if (!/^storage\//i.test(path)) path = `storage/${path}`;
    return `${location.origin}/${path}`;
  };
  const getAvatarUrl = (rec) => {
    if (!rec) return '';
    const keys = [
      'tiktok_avatar_url','tiktok_profile_pic_url','profile_pic_url',
      'profile_image_url','avatar_url','avatar','picture_url','picture',
    ];
    for (const k of keys) if (hasVal(rec[k])) return toImageSrc(rec[k]);
    if (rec.user && hasVal(rec.user.avatar_url)) return toImageSrc(rec.user.avatar_url);
    if (rec.creator && hasVal(rec.creator.avatar_url)) return toImageSrc(rec.creator.avatar_url);
    return '';
  };

  // Contact helpers
  const pickFirst = (obj, keys = []) => {
    if (!obj) return '';
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, k) && hasVal(obj[k])) {
        return String(obj[k]);
      }
    }
    return '';
  };
  const getFieldFromAny = (rec, keys = [], nests = ['registration','user','creator','profile','influencer']) => {
    const direct = pickFirst(rec, keys);
    if (direct) return direct;
    for (const n of nests) {
      const v = pickFirst(rec?.[n], keys);
      if (v) return v;
    }
    return '';
  };
  const setContactAnchor = (id, value, scheme = null) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (hasVal(value)) {
      el.textContent = value;
      if (scheme) {
        const hrefVal = scheme === 'tel' ? `tel:${value.replace(/\s+/g,'')}` : `mailto:${value}`;
        el.setAttribute('href', hrefVal);
      } else {
        el.removeAttribute('href');
      }
    } else {
      el.textContent = '—';
      el.removeAttribute('href');
    }
  };

  const setFileControls = (inputId, remoteUrl, { btnText = 'Lihat File' } = {}) => {
    const input = $("#"+inputId);
    const viewBtn = $("#"+inputId+"_view");
    if (!input || !viewBtn) return;

    if (hasVal(remoteUrl)) {
      viewBtn.href = remoteUrl;
      viewBtn.textContent = inputId.includes('screenshot') ? 'Lihat Gambar' : btnText;
      viewBtn.classList.remove('d-none');
      viewBtn.dataset.remote = '1';
    } else {
      viewBtn.classList.add('d-none');
      viewBtn.removeAttribute('href');
      delete viewBtn.dataset.remote;
    }
  };

  const wirePreview = (inputId) => {
    const input = $("#"+inputId);
    const viewBtn = $("#"+inputId+"_view");
    if (!input || !viewBtn) return;

    input.addEventListener('change', () => {
      const f = input.files?.[0];
      if (f) {
        const blobUrl = URL.createObjectURL(f);
        viewBtn.href = blobUrl;
        viewBtn.textContent = inputId.includes('screenshot') ? 'Preview Gambar' : 'Preview File';
        viewBtn.classList.remove('d-none');
        viewBtn.dataset.remote = '0';
      } else if (viewBtn.dataset.remote !== '1') {
        viewBtn.classList.add('d-none');
        viewBtn.removeAttribute('href');
      }
    });
  };

  const getMetric = (rec, slot, base) => {
    if (!rec) return '';
    const keys = [
      `${base}_${slot}`,
      `${base}${slot}`,
      `${base}_${slot}_count`,
      `${base}${slot}_count`,
      base,
      `${base}_count`,
    ];
    for (const k of keys) {
      if (k in rec && rec[k] != null && rec[k] !== '') return String(rec[k]);
    }
    return '';
  };

  // ===== Slot controls
  const addSlotBtn = $('#addSlotBtn');
  const contentSlotsWrap = $('#contentSlots');

  const visibleSlotsCount = () => {
    return Array.from(contentSlotsWrap.querySelectorAll('.slot')).filter(el => !el.classList.contains('d-none')).length;
  };
  const showNextHiddenSlot = () => {
    const hidden = Array.from(contentSlotsWrap.querySelectorAll('.slot.d-none'));
    if (!hidden.length) return;
    hidden[0].classList.remove('d-none');
    updateAddBtnState();
  };
  const hideSlot = (i) => {
    const el = contentSlotsWrap.querySelector(`.slot[data-slot="${i}"]`);
    if (!el) return;
    // kosongkan nilai saat di-hide
    ['link-'+i, 'post_date_'+i, 'views_'+i, 'likes_'+i, 'comments_'+i, 'shares_'+i].forEach(id => {
      const ctrl = $('#'+id);
      if (ctrl) ctrl.value = '';
    });
    const file = $('#screenshot_'+i);
    const view = $('#screenshot_'+i+'_view');
    if (file) file.value = '';
    if (view) { view.classList.add('d-none'); view.removeAttribute('href'); delete view.dataset.remote; }
    el.classList.add('d-none');
    updateAddBtnState();
  };
  const updateAddBtnState = () => {
    addSlotBtn.disabled = visibleSlotsCount() >= 5;
  };

  addSlotBtn.addEventListener('click', showNextHiddenSlot);
  contentSlotsWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-remove-slot');
    if (!btn) return;
    const slot = parseInt(btn.getAttribute('data-slot'), 10);
    if (slot > 2) hideSlot(slot);
  });

  // Required: slot 1 link & date wajib
  const makeRequiredBase = () => {
    const link1 = $('#link-1'), d1 = $('#post_date_1');
    if (link1) link1.setAttribute('required','required');
    if (d1) d1.setAttribute('required','required');
  };
  makeRequiredBase();

  // Preview listeners (screenshots + files)
  ['screenshot_1','screenshot_2','screenshot_3','screenshot_4','screenshot_5','invoice_file','review_proof_file'].forEach(wirePreview);

  // Acquisition visibility
  const acquisitionEl = $("#acquisition_method");
  const purchaseWrap = $("#purchaseFields");
  const purchasePlatformEl = $("#purchase_platform");
  const purchasePriceEl = $("#purchase_price");
  const shippingWrap = $("#shippingFields");
  const shippingCourierEl = $("#shipping_courier");
  const shippingResiEl = $("#shipping_tracking_number");
  const invoiceEl = $("#invoice_file");
  const invoiceView = $("#invoice_file_view");

  const applyAcquisitionVisibility = (rec = null) => {
    const mode = acquisitionEl.value;
    const showBuy = mode === 'buy';
    const showShip = mode === 'sent_by_brand';
    const hasInvoiceRemote = !!(rec ? getFileUrl(rec, 'invoice_file') : '');

    // BUY group (tetap wajib saat BUY)
    purchaseWrap.classList.toggle('d-none', !showBuy);
    [purchasePlatformEl, purchasePriceEl].forEach(el => {
      if (!el) return;
      if (showBuy) {
        el.removeAttribute('disabled');
        el.setAttribute('required','required');
      } else {
        el.setAttribute('disabled','disabled');
        el.removeAttribute('required');
        el.value = '';
      }
    });

    // Invoice only when BUY (tetap wajib kalau belum ada file)
    if (invoiceEl) {
      if (showBuy) {
        invoiceEl.removeAttribute('disabled');
        if (!hasInvoiceRemote) invoiceEl.setAttribute('required','required');
        else invoiceEl.removeAttribute('required');
      } else {
        invoiceEl.setAttribute('disabled','disabled');
        invoiceEl.removeAttribute('required');
        invoiceEl.value = '';
        if (invoiceView) {
          invoiceView.classList.add('d-none');
          invoiceView.removeAttribute('href');
          delete invoiceView.dataset.remote;
        }
      }
    }

    // SHIPPING group — TIDAK WAJIB (optional)
    shippingWrap.classList.toggle('d-none', !showShip);
    [shippingCourierEl, shippingResiEl].forEach(el => {
      if (!el) return;
      if (showShip) {
        el.removeAttribute('disabled');
        // >>> tidak set required
        el.removeAttribute('required');
      } else {
        el.setAttribute('disabled','disabled');
        el.removeAttribute('required');
        el.value = '';
      }
    });
  };
  acquisitionEl.addEventListener('change', () => applyAcquisitionVisibility(record));

  // Cancel → balik ke list submissions
  $('#cancelBtn').addEventListener('click', () => {
    history.pushState(null, '', '/admin/submissions');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  // ===== Prefill saat edit
  let record = null;

  async function fetchSubmissionById(id) {
    if (submissionService?.get) {
      return await submissionService.get(id);
    }
    const r = await fetch(`/api/influencer-submissions/${id}?_=${Date.now()}`, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (!r.ok) throw new Error('Fetch gagal');
    return await r.json();
  }

  function fillForm(rec) {
    // tampilkan slot 3-5 jika ada data
    [3,4,5].forEach(i => {
      const hasAny = hasVal(rec[`link_${i}`]) || hasVal(rec[`post_date_${i}`]) ||
                     hasVal(rec[`screenshot_${i}_path`]) || hasVal(rec[`screenshot_${i}_url`]) ||
                     hasVal(rec[`views_${i}`]) || hasVal(rec[`likes_${i}`]) ||
                     hasVal(rec[`comments_${i}`]) || hasVal(rec[`shares_${i}`]);
      if (hasAny) {
        const el = contentSlotsWrap.querySelector(`.slot[data-slot="${i}"]`);
        if (el) el.classList.remove('d-none');
      }
    });
    updateAddBtnState();

    // Texts & dates per slot
    [1,2,3,4,5].forEach(i => {
      $('#link-'+i).value = safe(rec[`link_${i}`], '');
      $('#post_date_'+i).value = toInputDate(rec[`post_date_${i}`]);
    });

    // Metrics per slot
    [1,2,3,4,5].forEach(i => {
      $('#views_'+i).value    = getMetric(rec, i, 'views');
      $('#likes_'+i).value    = getMetric(rec, i, 'likes');
      $('#comments_'+i).value = getMetric(rec, i, 'comments');
      $('#shares_'+i).value   = getMetric(rec, i, 'shares');
    });

    // File links (viewer) for screenshots
    [1,2,3,4,5].forEach(i => {
      setFileControls('screenshot_'+i, getFileUrl(rec, 'screenshot_'+i));
    });
    setFileControls('invoice_file',      getFileUrl(rec, 'invoice_file'),      { btnText: 'Lihat File' });
    setFileControls('review_proof_file', getFileUrl(rec, 'review_proof_file'), { btnText: 'Lihat File' });

    // Acquisition
    $('#acquisition_method').value = safe(rec.acquisition_method, '');
    $('#purchase_platform').value  = safe(rec.purchase_platform, '');
    $('#purchase_price').value     = safe(rec.purchase_price, '');
    $('#shipping_courier').value   = safe(rec.shipping_courier, '');
    $('#shipping_tracking_number').value = safe(rec.shipping_tracking_number, '');
    applyAcquisitionVisibility(rec);

    // Info KOL / Contact
    const kolBox = $('#kolInfo');
    if (rec) {
      const name   = safe(rec.tiktok_full_name || rec.full_name || rec.creator_name, '');
      const handle = safe(rec.tiktok_username ? '@'+rec.tiktok_username : (rec.username ? '@'+rec.username : ''), '');
      const avatar = getAvatarUrl(rec);

      if (name || handle || avatar) {
        $('#kolName').textContent = name || 'Creator';
        $('#kolHandle').textContent = handle || '';

        const icon = $('#kolAvatarIcon');
        const img  = $('#kolAvatarImg');

        if (avatar) {
          if (icon) icon.classList.add('d-none');
          if (img) {
            img.src = avatar;
            img.classList.remove('d-none');
            img.onerror = () => {
              if (img) img.classList.add('d-none');
              if (icon) icon.classList.remove('d-none');
            };
          }
        } else {
          if (img) img.classList.add('d-none');
          if (icon) icon.classList.remove('d-none');
        }

        // Contact details
        const phone = getFieldFromAny(rec, ['phone','phone_number','whatsapp','wa','mobile','telp','no_hp','contact_phone']);
        const email = getFieldFromAny(rec, ['email','contact_email','kol_email']);
        const addr  = getFieldFromAny(rec, ['address','alamat','street_address','shipping_address','domicile','address_line']);

        setContactAnchor('kolPhone', phone, 'tel');
        setContactAnchor('kolEmail', email, 'mailto');
        const addrEl = document.getElementById('kolAddress');
        if (addrEl) addrEl.textContent = hasVal(addr) ? addr : '—';

        kolBox.classList.remove('d-none');
      }
    }
  }

  if (isEdit) {
    try {
      record = await fetchSubmissionById(params.id);
      fillForm(record);
    } catch (e) {
      showToast('Gagal memuat data submission', 'error');
    } finally {
      hideLoader();
    }
  } else {
    hideLoader();
  }

  // ===== Submit (CREATE/UPDATE)
  $('#adminSubmissionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    // enforce basic validity: slot 1 link & date required
    const link1 = $('#link-1'), d1 = $('#post_date_1');
    if (link1) link1.setAttribute('required','required');
    if (d1) d1.setAttribute('required','required');

    if (!form.checkValidity()) {
      e.stopPropagation();
      form.classList.add('was-validated');
      return;
    }

    const fd = new FormData();

    // Pastikan pasangan KOL <-> Campaign tidak hilang saat edit
    const tiktok_user_id = record?.tiktok_user_id || query.tiktok_user_id || '';
    const campaign_id    = record?.campaign_id    || query.campaign_id    || '';
    if (tiktok_user_id) fd.set('tiktok_user_id', tiktok_user_id);
    if (campaign_id)    fd.set('campaign_id', campaign_id);

    // Field teks & tanggal (5 slot)
    const addField = (id, key = null) => {
      const el = $('#'+id);
      if (!el) return;
      const name = key || id.replace(/-/g,'_');
      if (el.type === 'number') return;
      if (hasVal(el.value)) fd.set(name, el.value.trim());
    };
    [1,2,3,4,5].forEach(i => {
      addField('link-'+i, `link_${i}`);
      addField('post_date_'+i, `post_date_${i}`);
    });

    // Number fields per slot (ikutkan 0 jika diisi 0)
    const addNumber = (id, key = null) => {
      const el = $('#'+id);
      if (!el) return;
      const name = key || id;
      if (el.value !== '') fd.set(name, String(Math.max(0, Number(el.value))));
    };
    [1,2,3,4,5].forEach(i => {
      addNumber(`views_${i}`);
      addNumber(`likes_${i}`);
      addNumber(`comments_${i}`);
      addNumber(`shares_${i}`);
    });

    // Acquisition
    addField('acquisition_method','acquisition_method');
    addField('purchase_platform','purchase_platform');
    addNumber('purchase_price','purchase_price');
    addField('shipping_courier','shipping_courier');
    addField('shipping_tracking_number','shipping_tracking_number');

    // Files
    [1,2,3,4,5].forEach(i => {
      const f = $('#screenshot_'+i)?.files?.[0];
      if (f) fd.set('screenshot_'+i, f);
    });
    const inv = $('#invoice_file')?.files?.[0];
    const rev = $('#review_proof_file')?.files?.[0];
    if (inv) fd.set('invoice_file', inv);
    if (rev) fd.set('review_proof_file', rev);

    const btn = $('#saveBtn');
    btn.disabled = true;
    showLoader();

    try {
      let resp;
      if (isEdit) {
        fd.set('_method', 'PATCH');

        if (submissionService?.update) {
          resp = await submissionService.update(params.id, fd);
        } else {
          const r = await fetch(`/api/influencer-submissions/${params.id}`, {
            method: 'POST',
            credentials: 'same-origin',
            body: fd,
          });
          if (!r.ok) throw new Error('Update gagal');
          resp = await r.json();
        }
        showToast(resp?.message || 'Submission berhasil diperbarui');
      } else {
        if (!tiktok_user_id || !campaign_id) {
          throw new Error('tiktok_user_id & campaign_id wajib untuk membuat submission.');
        }
        if (submissionService?.create) {
          resp = await submissionService.create(fd);
        } else {
          const r = await fetch(`/api/influencer-submissions`, {
            method: 'POST',
            credentials: 'same-origin',
            body: fd,
          });
          if (!r.ok) throw new Error('Buat submission gagal');
          resp = await r.json();
        }
        showToast(resp?.message || 'Submission berhasil dibuat');
      }

      history.pushState(null, '', '/admin/submissions');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      showToast(err.message || 'Proses gagal', 'error');
    } finally {
      hideLoader();
      btn.disabled = false;
    }
  });
}
