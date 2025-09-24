// /js/pages/submission/submission-management.js
export async function render(target, path, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();

  const [
    headerMod,
    breadcrumbMod,
    loaderMod,
    toastMod,
    campaignMod,
    submissionMod,
  ] = await Promise.all([
    import(`../../components/header.js?v=${v}`),
    import(`../../components/breadcrumb.js?v=${v}`),
    import(`../../components/loader.js?v=${v}`),
    import(`../../utils/toast.js?v=${v}`),
    import(`../../services/campaignService.js?v=${v}`),
    import(`../../services/influencerSubmissionService.js?v=${v}`),
  ]);

  const { renderHeader } = headerMod;
  const { renderBreadcrumb } = breadcrumbMod;
  const { showLoader, hideLoader } = loaderMod;
  const { showToast } = toastMod;
  const { campaignService } = campaignMod;
  const { submissionService } = submissionMod;

  // ---------- helpers ----------
  const $ = (sel) => document.querySelector(sel);

  const DUMMY_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
      <rect width="100%" height="100%" fill="#f1f3f5"/>
      <circle cx="36" cy="28" r="14" fill="#dee2e6"/>
      <rect x="12" y="46" width="48" height="18" rx="9" fill="#dee2e6"/>
    </svg>`);

  const avatarTag = (url) => {
    if (!url) {
      return `<img src="${DUMMY_AVATAR}" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover">`;
    }
    const safe = String(url).replace(/"/g,'&quot;');
    const dummy = DUMMY_AVATAR.replace(/"/g,'&quot;');
    return `<img src="${safe}" alt="" onerror="this.onerror=null;this.src='${dummy}'"
              style="width:36px;height:36px;border-radius:50%;object-fit:cover">`;
  };

  const kolNameOf = (s={}) =>
    s.full_name ||
    s.tiktok_full_name ||
    (s.tiktok_username ? `@${s.tiktok_username}` : null) ||
    s.display_name ||
    s.tiktok_display_name ||
    s.name ||
    s.creator_name ||
    s.influencer_name ||
    s.user_name ||
    '-';

  const kolAvatarOf = (s={}) =>
    s.avatar_url ||
    s.profile_pic_url ||
    s.tiktok_avatar_url ||
    s.influencer_avatar_url ||
    null;

  const fmtDateTime = (s) => (s ? new Date(s).toLocaleString('id-ID') : '—');
  const fmtNum = (n) => (n === 0 || n ? Number(n).toLocaleString('id-ID') : '-');

  const toInputDate = (val) => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d)) return String(val).slice(0,10);
    const k = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return k.toISOString().slice(0,10);
  };

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

  const getShotUrl = (rec, i) =>
    toFileUrl(rec[`screenshot_${i}_url`] || rec[`screenshot_${i}_path`]);

  const getInvoiceUrl = (rec) =>
    toFileUrl(rec.invoice_file_url || rec.invoice_file_path);

  const getReviewUrl = (rec) =>
    toFileUrl(
      rec.review_proof_file_url ||
      rec.review_proof_file_path ||
      rec.review_url || rec.review_path
    );

  // ambil content_quota campaign (maks 5 kolom)
  async function getCampaignContentPerKol(campaignId) {
    if (!campaignId) return 1;
    try {
      const detail = await campaignService.get(campaignId);
      const c = detail?.data ?? detail ?? null;
      if (!c) return 1;

      const qKeys = [
        'content_quota','contents_quota','contentQuota',
        'contents_per_kol','content_per_kol','posts_per_kol','post_per_kol'
      ];
      for (const k of qKeys) {
        const n = Number(c[k] ?? c?.kpi_targets?.[k]);
        if (Number.isFinite(n) && n > 0) return Math.min(5, n);
      }
      return 1;
    } catch { return 1; }
  }

  // ---------- mount skeleton ----------
  showLoader();
  target.innerHTML = '';

  renderHeader('header');
  renderBreadcrumb(target, path, labelOverride || 'Submission Management');

  target.innerHTML += `
    <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <select id="campaignFilter" class="form-select" style="min-width:260px">
          <option value="">— Pilih Campaign —</option>
        </select>
        <input class="form-control" style="min-width:260px" type="search" placeholder="Cari KOL / link…" id="searchInput">
      </div>
      <div class="d-flex align-items-center gap-2 flex-wrap">
        <button class="btn btn-outline-secondary" id="btnRefresh">
          <i class="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>
    </div>

    <div id="list-wrap"></div>

    <nav class="mt-3">
      <ul class="pagination" id="pagination"></ul>
    </nav>
  `;

  // ---------- DOM refs ----------
  const campaignFilter = $('#campaignFilter');
  const searchInput    = $('#searchInput');
  const listWrap       = $('#list-wrap');
  const pager          = $('#pagination');
  const btnRefresh     = $('#btnRefresh');

  // ---------- state ----------
  let currentPage = 1;
  let currentCampaignId = '';
  let currentKeyword = '';
  let debounce = null;
  let requiredSlots = 1;

  // ---------- populate campaign filter ----------
  try {
    const data = await campaignService.getAll({ page: 1, per_page: 100, status: '' });
    const items = data?.data || [];
    campaignFilter.innerHTML =
      `<option value="">— Pilih Campaign —</option>` +
      items.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const qId = query?.campaign_id || new URL(location.href).searchParams.get('campaign_id');
    if (qId && campaignFilter.querySelector(`option[value="${qId}"]`)) {
      campaignFilter.value = qId;
    }
    currentCampaignId = campaignFilter.value || '';
    requiredSlots = await getCampaignContentPerKol(currentCampaignId);
  } catch {}

  // ---------- API ----------
  async function fetchSubmissions({ page = 1, per_page = 20, campaign_id }) {
    const res = await submissionService.getAll({
      page,
      per_page,
      include: 'campaign',
      campaign_id,
    });
    return res;
  }

  function metric(rec, slot, base) {
    const keys = [
      `${base}_${slot}`,
      `${base}${slot}`,
      `${base}_${slot}_count`,
      `${base}${slot}_count`,
      base,
      `${base}_count`,
    ];
    for (const k of keys) if (k in rec && rec[k] != null) return rec[k];
    return '';
  }

  // ---------- SAVE SLOT ----------
  async function saveSlotRow(tr) {
    const submissionId = tr.getAttribute('data-submission-id');
    const slot = Number(tr.getAttribute('data-slot') || 1);

    // ambil nilai input
    const link     = tr.querySelector('.js-link')?.value?.trim() ?? '';
    const pdate    = tr.querySelector('.js-postdate')?.value ?? '';
    const views    = tr.querySelector('.js-views')?.value ?? '';
    const likes    = tr.querySelector('.js-likes')?.value ?? '';
    const comments = tr.querySelector('.js-comments')?.value ?? '';
    const shares   = tr.querySelector('.js-shares')?.value ?? '';
    const saves    = tr.querySelector('.js-saves')?.value ?? '';
    const shotFile = tr.querySelector('.js-screenshot')?.files?.[0];

    const btn = tr.querySelector('.js-save');
    const oldHtml = btn?.innerHTML;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Simpan…`;
    }

    try {
      const fd = new FormData();
      fd.set('_method', 'PATCH');

      if (link !== '')     fd.set(`link_${slot}`, link);
      if (pdate !== '')    fd.set(`post_date_${slot}`, pdate);
      if (views !== '')    fd.set(`views_${slot}`, String(Math.max(0, Number(views) || 0)));
      if (likes !== '')    fd.set(`likes_${slot}`, String(Math.max(0, Number(likes) || 0)));
      if (comments !== '') fd.set(`comments_${slot}`, String(Math.max(0, Number(comments) || 0)));
      if (shares !== '')   fd.set(`shares_${slot}`, String(Math.max(0, Number(shares) || 0)));
      if (saves !== '')    fd.set(`saves_${slot}`, String(Math.max(0, Number(saves) || 0)));
      if (shotFile)        fd.set(`screenshot_${slot}`, shotFile);

      // kalau tak ada perubahan sama sekali
      let hasAny = false;
      for (const _ of fd.keys()) { hasAny = true; break; }
      if (!hasAny) { showToast('Tidak ada perubahan untuk disimpan.', 'error'); return; }

      if (submissionService?.update) {
        await submissionService.update(submissionId, fd);
      } else {
        const r = await fetch(`/api/influencer-submissions/${encodeURIComponent(submissionId)}`, {
          method: 'POST', credentials: 'same-origin', body: fd,
        });
        if (!r.ok) throw new Error('Gagal menyimpan');
        await r.json();
      }

      showToast('Tersimpan.');
      await loadList(currentPage);
    } catch (e) {
      showToast(e?.message || 'Gagal menyimpan.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = oldHtml || 'Simpan'; }
    }
  }

  // ---------- SAVE ACQUISITION / INVOICE / REVIEW ----------
  async function saveAcquisition(card) {
    const submissionId = card.getAttribute('data-submission-id');

    const method  = card.querySelector('.js-acq')?.value || '';
    const plat    = card.querySelector('.js-buy-platform')?.value || '';
    const price   = card.querySelector('.js-buy-price')?.value || '';
    const courier = card.querySelector('.js-ship-courier')?.value || '';
    const resi    = card.querySelector('.js-ship-tracking')?.value || '';
    const inv     = card.querySelector('.js-invoice')?.files?.[0];
    const rev     = card.querySelector('.js-review')?.files?.[0];

    const btn = card.querySelector('.js-save-acq');
    const old = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Simpan…`; }

    try {
      const fd = new FormData();
      fd.set('_method', 'PATCH');

      if (method) fd.set('acquisition_method', method);

      if (method === 'buy') {
        if (plat)  fd.set('purchase_platform', plat);
        if (price !== '') fd.set('purchase_price', String(Math.max(0, Number(price) || 0)));
      } else if (method === 'sent_by_brand') {
        if (courier) fd.set('shipping_courier', courier);
        if (resi)    fd.set('shipping_tracking_number', resi);
      } else {
        // kalau kosong, tetap kirim yg ada saja (optional)
        if (plat)  fd.set('purchase_platform', plat);
        if (price !== '') fd.set('purchase_price', String(Math.max(0, Number(price) || 0)));
        if (courier) fd.set('shipping_courier', courier);
        if (resi)    fd.set('shipping_tracking_number', resi);
      }

      if (inv) fd.set('invoice_file', inv);
      if (rev) fd.set('review_proof_file', rev);

      let hasAny = false;
      for (const _ of fd.keys()) { hasAny = true; break; }
      if (!hasAny) { showToast('Tidak ada perubahan untuk disimpan.', 'error'); return; }

      if (submissionService?.update) {
        await submissionService.update(submissionId, fd);
      } else {
        const r = await fetch(`/api/influencer-submissions/${encodeURIComponent(submissionId)}`, {
          method: 'POST', credentials: 'same-origin', body: fd,
        });
        if (!r.ok) throw new Error('Gagal menyimpan');
        await r.json();
      }

      showToast('Detail produk tersimpan.');
      await loadList(currentPage);
    } catch (e) {
      showToast(e?.message || 'Gagal menyimpan detail produk.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = old || 'Simpan Detail Produk'; }
    }
  }

  // ---------- UI builders ----------
  function buildSlotRow(rec, slot, evenBg=false) {
    const link     = rec[`link_${slot}`] ?? '';
    const pdate    = rec[`post_date_${slot}`] ? toInputDate(rec[`post_date_${slot}`]) : '';
    const shotUrl  = getShotUrl(rec, slot);

    const views    = metric(rec, slot, 'views');
    const likes    = metric(rec, slot, 'likes');
    const comments = metric(rec, slot, 'comments');
    const shares   = metric(rec, slot, 'shares');
    const saves    = metric(rec, slot, 'saves') || metric(rec, slot, 'bookmarks') || '';

    const shotView = shotUrl
      ? `<a class="btn btn-sm btn-outline-secondary js-shot-view" href="${shotUrl}" target="_blank" rel="noopener">Lihat</a>`
      : `<a class="btn btn-sm btn-outline-secondary js-shot-view d-none" href="#" target="_blank" rel="noopener">Lihat</a>`;

    return `
      <tr data-submission-id="${rec.id}" data-slot="${slot}" class="${evenBg ? 'bg-light' : ''}">
        <td style="min-width:260px">
          <input type="url" class="form-control form-control-sm js-link" placeholder="https://…" value="${String(link).replace(/"/g,'&quot;')}">
        </td>
        <td style="min-width:160px">
          <input type="date" class="form-control form-control-sm js-postdate" value="${pdate}">
        </td>
        <td style="min-width:260px">
          <div class="d-flex gap-2">
            <input type="file" class="form-control form-control-sm js-screenshot" accept="image/*" style="max-width:180px">
            ${shotView}
          </div>
        </td>
        <td style="width:120px"><input type="number" min="0" class="form-control form-control-sm js-views"    value="${views ?? ''}"></td>
        <td style="width:120px"><input type="number" min="0" class="form-control form-control-sm js-likes"    value="${likes ?? ''}"></td>
        <td style="width:120px"><input type="number" min="0" class="form-control form-control-sm js-comments" value="${comments ?? ''}"></td>
        <td style="width:120px"><input type="number" min="0" class="form-control form-control-sm js-shares"   value="${shares ?? ''}"></td>
        <td style="width:120px"><input type="number" min="0" class="form-control form-control-sm js-saves"    value="${saves ?? ''}"></td>
        <td style="width:120px" class="text-end">
          <button class="btn btn-sm btn-outline-primary js-save">
            <i class="bi bi-check2-circle"></i> Simpan
          </button>
        </td>
      </tr>
    `;
  }

  function buildAcquisitionBlock(rec) {
    const method = rec.acquisition_method || '';
    const isBuy = method === 'buy';
    const isShip = method === 'sent_by_brand';

    const plat  = rec.purchase_platform || '';
    const price = rec.purchase_price ?? '';

    const courier = rec.shipping_courier || '';
    const resi    = rec.shipping_tracking_number || '';

    const invUrl  = getInvoiceUrl(rec);
    const revUrl  = getReviewUrl(rec);

    return `
      <div class="p-3 border-top">
        <div class="row g-3 align-items-end">
          <div class="col-md-4">
            <label class="form-label text-muted">Cara Mendapatkan Produk</label>
            <select class="form-select js-acq">
              <option value="">-- Pilih --</option>
              <option value="buy" ${isBuy ? 'selected' : ''}>Beli sendiri</option>
              <option value="sent_by_brand" ${isShip ? 'selected' : ''}>Dikirim oleh Brand</option>
            </select>
          </div>

          <!-- BUY -->
          <div class="col-12"></div>
          <div class="col-md-3 js-buy-wrap ${isBuy ? '' : 'd-none'}">
            <label class="form-label text-muted">Beli di mana</label>
            <select class="form-select js-buy-platform">
              <option value="">-- Pilih --</option>
              <option value="tiktokshop" ${plat==='tiktokshop'?'selected':''}>TikTok Shop</option>
              <option value="shopee" ${plat==='shopee'?'selected':''}>Shopee</option>
            </select>
          </div>
          <div class="col-md-3 js-buy-wrap ${isBuy ? '' : 'd-none'}">
            <label class="form-label text-muted">Harga</label>
            <input type="number" min="0" step="0.01" class="form-control js-buy-price" value="${price !== '' ? price : ''}">
          </div>
          <div class="col-md-6 js-buy-wrap ${isBuy ? '' : 'd-none'}">
            <label class="form-label text-muted">Upload Invoice</label>
            <div class="d-flex gap-2">
              <input type="file" class="form-control js-invoice" accept="application/pdf,image/*" style="max-width:220px">
              <a class="btn btn-outline-secondary js-invoice-view ${invUrl ? '' : 'd-none'}" ${invUrl ? `href="${invUrl}" target="_blank" rel="noopener"` : ''}>Lihat File</a>
            </div>
            <small class="text-muted">PDF/JPG/PNG</small>
          </div>

          <!-- SENT BY BRAND -->
          <div class="col-md-3 js-ship-wrap ${isShip ? '' : 'd-none'}">
            <label class="form-label text-muted">Nama Ekspedisi</label>
            <input type="text" class="form-control js-ship-courier" value="${courier}">
          </div>
          <div class="col-md-3 js-ship-wrap ${isShip ? '' : 'd-none'}">
            <label class="form-label text-muted">Nomor Resi</label>
            <input type="text" class="form-control js-ship-tracking" value="${resi}">
          </div>

          <!-- Review Proof -->
          <div class="col-md-6">
            <label class="form-label text-muted">Upload Bukti Review</label>
            <div class="d-flex gap-2">
              <input type="file" class="form-control js-review" accept="application/pdf,image/*" style="max-width:220px">
              <a class="btn btn-outline-secondary js-review-view ${revUrl ? '' : 'd-none'}" ${revUrl ? `href="${revUrl}" target="_blank" rel="noopener"` : ''}>Lihat File</a>
            </div>
            
          </div>

          <div class="col-12 d-flex justify-content-end">
            <button type="button" class="btn btn-primary js-save-acq">
              <i class="bi bi-save"></i> Simpan Data
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function attachCardHandlers(cardEl) {
    // Simpan per-slot
    cardEl.querySelectorAll('tr[data-submission-id] .js-save').forEach(btn => {
      btn.addEventListener('click', () => {
        const tr = btn.closest('tr[data-submission-id]');
        if (tr) saveSlotRow(tr);
      });
    });

    // Enter di input mana pun dalam baris slot → simpan
    cardEl.querySelectorAll('tr[data-submission-id] input').forEach(inp => {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const tr = inp.closest('tr[data-submission-id]');
          if (tr) saveSlotRow(tr);
        }
      });
    });

    // Preview screenshot lokal
    cardEl.querySelectorAll('tr[data-submission-id] .js-screenshot').forEach(file => {
      file.addEventListener('change', () => {
        const tr = file.closest('tr[data-submission-id]');
        const view = tr?.querySelector('.js-shot-view');
        if (!view) return;
        const f = file.files?.[0];
        if (f) {
          const url = URL.createObjectURL(f);
          view.href = url;
          view.classList.remove('d-none');
          view.textContent = 'Preview';
        } else {
          // biarkan tetap "Lihat" kalau remote sudah ada; kalau tidak ada, hide
          if (!view.getAttribute('href')) view.classList.add('d-none');
        }
      });
    });

    // Acquisition toggles
    const acqSel = cardEl.querySelector('.js-acq');
    const buyWraps = cardEl.querySelectorAll('.js-buy-wrap');
    const shipWraps = cardEl.querySelectorAll('.js-ship-wrap');

    const applyAcqVisibility = () => {
      const mode = acqSel?.value || '';
      const showBuy = mode === 'buy';
      const showShip = mode === 'sent_by_brand';
      buyWraps.forEach(el => el.classList.toggle('d-none', !showBuy));
      shipWraps.forEach(el => el.classList.toggle('d-none', !showShip));
    };
    acqSel?.addEventListener('change', applyAcqVisibility);
    applyAcqVisibility();

    // Invoice/Review preview on file pick
    const invoiceInput = cardEl.querySelector('.js-invoice');
    const invoiceView  = cardEl.querySelector('.js-invoice-view');
    invoiceInput?.addEventListener('change', () => {
      const f = invoiceInput.files?.[0];
      if (f) {
        const url = URL.createObjectURL(f);
        if (invoiceView) { invoiceView.href = url; invoiceView.classList.remove('d-none'); invoiceView.textContent = 'Preview'; }
      } else if (invoiceView && !invoiceView.getAttribute('href')) {
        invoiceView.classList.add('d-none');
      }
    });

    const reviewInput = cardEl.querySelector('.js-review');
    const reviewView  = cardEl.querySelector('.js-review-view');
    reviewInput?.addEventListener('change', () => {
      const f = reviewInput.files?.[0];
      if (f) {
        const url = URL.createObjectURL(f);
        if (reviewView) { reviewView.href = url; reviewView.classList.remove('d-none'); reviewView.textContent = 'Preview'; }
      } else if (reviewView && !reviewView.getAttribute('href')) {
        reviewView.classList.add('d-none');
      }
    });

    // Simpan acquisition
    cardEl.querySelector('.js-save-acq')?.addEventListener('click', () => saveAcquisition(cardEl));
  }

  async function loadList(page = 1) {
    currentCampaignId = campaignFilter.value || '';
    if (!currentCampaignId) {
      listWrap.innerHTML = `<div class="alert alert-info">Silakan pilih <b>Campaign</b> terlebih dahulu.</div>`;
      pager.innerHTML = '';
      hideLoader();
      return;
    }

    showLoader();
    try {
      const res = await fetchSubmissions({ page, per_page: 20, campaign_id: currentCampaignId });
      const items = res?.data || [];

      // Search
      const kw = (currentKeyword || '').toLowerCase().trim();
      const filtered = kw
        ? items.filter(s => {
            const name = kolNameOf(s);
            const hay = [
              name,
              s.tiktok_user_id || '',
              s.link_1 || '', s.link_2 || '', s.link_3 || '', s.link_4 || '', s.link_5 || '',
            ].join(' ').toLowerCase();
            return hay.includes(kw);
          })
        : items;

      if (!filtered.length) {
        listWrap.innerHTML = `<div class="text-center text-muted">Tidak ada data.</div>`;
        pager.innerHTML = '';
        hideLoader();
        return;
      }

      const maxSlots = Math.max(1, Number(requiredSlots) || 1);
      const cards = [];

      for (const s of filtered) {
        const avatar = kolAvatarOf(s);
        const name = kolNameOf(s);
        const updated = fmtDateTime(s.updated_at || s.created_at);

        const rows = [];
        for (let i = 1; i <= maxSlots; i++) {
          rows.push(buildSlotRow(s, i, i % 2 === 0));
        }

        cards.push(`
          <div class="card mb-3" data-submission-id="${s.id}">
            <div class="card-header bg-white d-flex justify-content-between align-items-center">
              <div class="d-flex align-items-center gap-2">
                ${avatarTag(avatar)}
                <div>
                  <div class="fw-semibold">${name}</div>
                  <div class="text-muted small">Updated: ${updated}</div>
                </div>
              </div>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table mb-0">
                  <thead class="table-light">
                    <tr>
                      <th style="min-width:260px">Post Link</th>
                      <th style="min-width:160px">Tanggal Postingan</th>
                      <th style="min-width:260px">Screenshot Postingan</th>
                      <th style="width:120px">Views</th>
                      <th style="width:120px">Likes</th>
                      <th style="width:120px">Comments</th>
                      <th style="width:120px">Shares</th>
                      <th style="width:120px">Saves</th>
                      <th style="width:120px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows.join('')}
                  </tbody>
                </table>
              </div>
              ${buildAcquisitionBlock(s)}
            </div>
          </div>
        `);
      }

      listWrap.innerHTML = cards.join('');
      listWrap.querySelectorAll('.card').forEach(attachCardHandlers);

      // Pagination (Laravel paginator)
      const last = res?.last_page ?? 1;
      const cur  = res?.current_page ?? page;
      pager.innerHTML = '';
      if (last > 1) {
        for (let i = 1; i <= last; i++) {
          const li = document.createElement('li');
          li.className = `page-item ${i === cur ? 'active' : ''}`;
          li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
          li.addEventListener('click', (e) => {
            e.preventDefault();
            currentPage = i;
            loadList(currentPage);
          });
          pager.appendChild(li);
        }
      }
    } catch (err) {
      console.error(err);
      listWrap.innerHTML = `<div class="text-danger">Gagal memuat data.</div>`;
      pager.innerHTML = '';
    } finally {
      hideLoader();
    }
  }

  // ---------- events ----------
  campaignFilter.addEventListener('change', async () => {
    currentPage = 1;
    currentCampaignId = campaignFilter.value || '';
    requiredSlots = await getCampaignContentPerKol(currentCampaignId);
    loadList(currentPage);
  });

  searchInput.addEventListener('input', (e) => {
    currentKeyword = e.target.value;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      currentPage = 1;
      loadList(currentPage);
    }, 250);
  });

  btnRefresh?.addEventListener('click', () => loadList(currentPage));

  // ---------- init ----------
  if (campaignFilter.value) {
    await loadList(currentPage);
  } else {
    hideLoader();
  }
}
