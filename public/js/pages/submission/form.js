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

  target.innerHTML += `
    <form id="adminSubmissionForm" class="bg-white p-4 rounded shadow-sm needs-validation" novalidate>
      <h5 class="mb-4">${title}</h5>

      <!-- Info KOL (optional, terisi saat edit) -->
      <div id="kolInfo" class="alert alert-light border d-none mb-4">
        <div class="d-flex align-items-center gap-3">
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
          <div class="text-muted small">
            <span class="me-3">Campaign ID: <code id="campId">-</code></span>
            <span>TikTok User ID: <code id="ttUserId">-</code></span>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <!-- BARIS 1 -->
        <div class="col-12">
          <div class="row g-3 align-items-end">
            <div class="col-md-4">
              <label for="link-1" class="form-label text-muted">Link Postingan 1</label>
              <input type="url" class="form-control" id="link-1" placeholder="https://www.tiktok.com/..." required>
              <div class="invalid-feedback">Link Postingan 1 wajib diisi (URL valid).</div>
            </div>
            <div class="col-md-4">
              <label for="post_date_1" class="form-label text-muted">Tanggal Postingan 1</label>
              <input type="date" class="form-control" id="post_date_1" required>
              <div class="invalid-feedback">Tanggal Postingan 1 wajib diisi.</div>
            </div>
            <div class="col-md-4">
              <label for="screenshot_1" class="form-label text-muted">Screenshot Postingan 1</label>
              <input type="file" class="form-control" id="screenshot_1" accept="image/*">
              <a id="screenshot_1_view" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-sm mt-2 d-none">Lihat Gambar</a>
            </div>
          </div>

          <!-- METRICS CONTENT 1 -->
          <div class="row g-3 mt-1">
            <div class="col-md-3">
              <label for="views_1" class="form-label text-muted">Views 1</label>
              <input type="number" min="0" step="1" class="form-control" id="views_1" placeholder="0">
              <div class="invalid-feedback">Isi angka ≥ 0.</div>
            </div>
            <div class="col-md-3">
              <label for="likes_1" class="form-label text-muted">Likes 1</label>
              <input type="number" min="0" step="1" class="form-control" id="likes_1" placeholder="0">
              <div class="invalid-feedback">Isi angka ≥ 0.</div>
            </div>
            <div class="col-md-3">
              <label for="comments_1" class="form-label text-muted">Comments 1</label>
              <input type="number" min="0" step="1" class="form-control" id="comments_1" placeholder="0">
              <div class="invalid-feedback">Isi angka ≥ 0.</div>
            </div>
            <div class="col-md-3">
              <label for="shares_1" class="form-label text-muted">Shares 1</label>
              <input type="number" min="0" step="1" class="form-control" id="shares_1" placeholder="0">
              <div class="invalid-feedback">Isi angka ≥ 0.</div>
            </div>
          </div>
        </div>

        <!-- BARIS 2 (opsional) -->
        <div class="col-12">
          <div class="row g-3 align-items-end">
            <div class="col-md-4">
              <label for="link-2" class="form-label text-muted">Link Postingan 2 (Opsional)</label>
              <input type="url" class="form-control" id="link-2" placeholder="https://www.tiktok.com/...">
              <div class="invalid-feedback">Jika diisi, harus URL yang valid.</div>
            </div>
            <div class="col-md-4">
              <label for="post_date_2" class="form-label text-muted">Tanggal Postingan 2</label>
              <input type="date" class="form-control" id="post_date_2">
              <div class="invalid-feedback">Jika diisi, pilih tanggal yang valid.</div>
            </div>
            <div class="col-md-4">
              <label for="screenshot_2" class="form-label text-muted">Screenshot Postingan 2</label>
              <input type="file" class="form-control" id="screenshot_2" accept="image/*">
              <a id="screenshot_2_view" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-sm mt-2 d-none">Lihat Gambar</a>
            </div>
          </div>

          <!-- METRICS CONTENT 2 -->
          <div class="row g-3 mt-1">
            <div class="col-md-3">
              <label for="views_2" class="form-label text-muted">Views 2</label>
              <input type="number" min="0" step="1" class="form-control" id="views_2" placeholder="0">
              <div class="invalid-feedback">Isi angka ≥ 0.</div>
            </div>
            <div class="col-md-3">
              <label for="likes_2" class="form-label text-muted">Likes 2</label>
              <input type="number" min="0" step="1" class="form-control" id="likes_2" placeholder="0">
              <div class="invalid-feedback">Isi angka ≥ 0.</div>
            </div>
            <div class="col-md-3">
              <label for="comments_2" class="form-label text-muted">Comments 2</label>
              <input type="number" min="0" step="1" class="form-control" id="comments_2" placeholder="0">
              <div class="invalid-feedback">Isi angka ≥ 0.</div>
            </div>
            <div class="col-md-3">
              <label for="shares_2" class="form-label text-muted">Shares 2</label>
              <input type="number" min="0" step="1" class="form-control" id="shares_2" placeholder="0">
              <div class="invalid-feedback">Isi angka ≥ 0.</div>
            </div>
          </div>
        </div>

        <!-- Beli di mana -->
        <div class="col-md-6">
          <label for="purchase_platform" class="form-label text-muted">Beli di mana</label>
          <select id="purchase_platform" class="form-select">
            <option value="">-- Pilih --</option>
            <option value="tiktokshop">TikTok Shop</option>
            <option value="shopee">Shopee</option>
          </select>
        </div>

        <!-- Invoice & Bukti Review -->
        <div class="col-md-6">
          <label for="invoice_file" class="form-label text-muted">Upload Invoice Pembelian</label>
          <input type="file" class="form-control" id="invoice_file" accept="application/pdf,image/*">
          <small class="text-muted">PDF/JPG/PNG, opsional</small>
          <a id="invoice_file_view" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-sm mt-2 d-none">Lihat File</a>
        </div>

        <div class="col-md-6">
          <label for="review_proof_file" class="form-label text-muted">Upload Bukti Review/Rate</label>
          <input type="file" class="form-control" id="review_proof_file" accept="application/pdf,image/*">
          <small class="text-muted">PDF/JPG/PNG, opsional</small>
          <a id="review_proof_file_view" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-sm mt-2 d-none">Lihat File</a>
        </div>

        <div class="col-12 pt-2 d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-secondary" id="cancelBtn"><i class="bi bi-x-square"></i> Batal</button>
          <button type="submit" class="btn btn-primary px-4" id="saveBtn"><i class="bi bi-save"></i> Simpan</button>
        </div>
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

  // === Viewer link: /files?p=... (bukan /storage/...) untuk file download/preview (bukan untuk <img>)
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

  // === Avatar helpers (untuk <img src>) ===
  const toImageSrc = (raw) => {
    if (!hasVal(raw)) return '';
    const s = String(raw).trim();
    // biarkan http(s) / data: apa adanya
    if (/^(https?:\/\/|data:image)/i.test(s)) return s;
    // path relatif → pastikan jadi /storage/...
    let path = s.replace(/^\/+/, '');
    if (!/^storage\//i.test(path)) path = `storage/${path}`;
    return `${location.origin}/${path}`;
  };

  const getAvatarUrl = (rec) => {
    if (!rec) return '';
    const keys = [
      'tiktok_avatar_url',
      'tiktok_profile_pic_url',
      'profile_pic_url',
      'profile_image_url',
      'avatar_url',
      'avatar',
      'picture_url',
      'picture',
    ];
    for (const k of keys) {
      if (hasVal(rec[k])) return toImageSrc(rec[k]);
    }
    // nested possibilities
    if (rec.user && hasVal(rec.user.avatar_url)) return toImageSrc(rec.user.avatar_url);
    if (rec.creator && hasVal(rec.creator.avatar_url)) return toImageSrc(rec.creator.avatar_url);
    return '';
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

  // Ambil metric per slot (support berbagai penamaan)
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

  // Preview listeners
  ['screenshot_1','screenshot_2','invoice_file','review_proof_file'].forEach(wirePreview);

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
    // Texts & dates
    $('#link-1').value = safe(rec.link_1, '');
    $('#link-2').value = safe(rec.link_2, '');
    $('#post_date_1').value = toInputDate(rec.post_date_1);
    $('#post_date_2').value = toInputDate(rec.post_date_2);
    $('#purchase_platform').value = safe(rec.purchase_platform, '');

    // Metrics content 1
    $('#views_1').value    = getMetric(rec, 1, 'views');
    $('#likes_1').value    = getMetric(rec, 1, 'likes');
    $('#comments_1').value = getMetric(rec, 1, 'comments');
    $('#shares_1').value   = getMetric(rec, 1, 'shares');

    // Metrics content 2
    $('#views_2').value    = getMetric(rec, 2, 'views');
    $('#likes_2').value    = getMetric(rec, 2, 'likes');
    $('#comments_2').value = getMetric(rec, 2, 'comments');
    $('#shares_2').value   = getMetric(rec, 2, 'shares');

    // File links (viewer)
    setFileControls('screenshot_1',      getFileUrl(rec, 'screenshot_1'));
    setFileControls('screenshot_2',      getFileUrl(rec, 'screenshot_2'));
    setFileControls('invoice_file',      getFileUrl(rec, 'invoice_file'),      { btnText: 'Lihat File' });
    setFileControls('review_proof_file', getFileUrl(rec, 'review_proof_file'), { btnText: 'Lihat File' });

    // Info KOL / Campaign
    const kolBox = $('#kolInfo');
    if (rec) {
      $('#campId').textContent = safe(rec.campaign_id, '-');
      $('#ttUserId').textContent = safe(rec.tiktok_user_id, '-');

      const name   = safe(rec.tiktok_full_name || rec.full_name || rec.creator_name, '');
      const handle = safe(rec.tiktok_username ? '@'+rec.tiktok_username : (rec.username ? '@'+rec.username : ''), '');
      const avatar = getAvatarUrl(rec);

      // set texts
      if (name || handle || avatar) {
        $('#kolName').textContent = name || 'Creator';
        $('#kolHandle').textContent = handle || '';

        const icon = $('#kolAvatarIcon');
        const img  = $('#kolAvatarImg');

        if (avatar) {
          // tampilkan img, sembunyikan icon
          if (icon) icon.classList.add('d-none');
          if (img) {
            img.src = avatar;
            img.classList.remove('d-none');
            // fallback jika 404/invalid
            img.onerror = () => {
              if (img) img.classList.add('d-none');
              if (icon) icon.classList.remove('d-none');
            };
          }
        } else {
          // tanpa avatar → pakai icon
          if (img) img.classList.add('d-none');
          if (icon) icon.classList.remove('d-none');
        }

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

    // Field teks & tanggal
    const addField = (id, key = null) => {
      const el = $('#'+id);
      if (!el) return;
      const name = key || id.replace(/-/g,'_');
      if (el.type === 'number') return;
      if (hasVal(el.value)) fd.set(name, el.value.trim());
    };
    addField('link-1', 'link_1');
    addField('post_date_1', 'post_date_1');
    addField('link-2', 'link_2');
    addField('post_date_2', 'post_date_2');
    addField('purchase_platform', 'purchase_platform');

    // Number fields (ikutkan 0 juga jika diisi 0)
    const addNumber = (id) => {
      const el = $('#'+id);
      if (!el) return;
      const name = id;
      if (el.value !== '') fd.set(name, String(Math.max(0, Number(el.value))));
    };
    ['views_1','likes_1','comments_1','shares_1'].forEach(addNumber);
    ['views_2','likes_2','comments_2','shares_2'].forEach(addNumber);

    // Files
    const sc1 = $('#screenshot_1')?.files?.[0];
    const sc2 = $('#screenshot_2')?.files?.[0];
    const inv = $('#invoice_file')?.files?.[0];
    const rev = $('#review_proof_file')?.files?.[0];
    if (sc1) fd.set('screenshot_1', sc1);
    if (sc2) fd.set('screenshot_2', sc2);
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
