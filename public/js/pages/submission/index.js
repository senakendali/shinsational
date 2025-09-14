// /js/pages/admin/submissions-list.js
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

  showLoader();
  target.innerHTML = '';

  renderHeader('header');
  renderBreadcrumb(target, path, labelOverride);

  // ---- main skeleton
  target.innerHTML += `
    <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <select id="campaignFilter" class="form-select" style="min-width:260px">
          <option value="">— Pilih Campaign —</option>
        </select>
        <input class="form-control" style="min-width:260px" type="search" placeholder="Cari KOL / link…" id="searchInput">
      </div>
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-outline-secondary btn-refresh-all" type="button">
          <i class="bi bi-arrow-clockwise"></i> Refresh visible
        </button>
      </div>
    </div>

    <div id="submission-list"></div>

    <nav class="mt-3">
      <ul class="pagination" id="pagination"></ul>
    </nav>
  `;

  // ---- inject lightweight "Input Resi" modal (once)
  if (!document.getElementById('resiModal')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="resiModal" class="position-fixed top-0 start-0 w-100 h-100 d-none"
           style="background:rgba(0,0,0,.35); z-index:2000;">
        <div class="bg-white rounded shadow p-3"
             style="max-width:520px; width:92%; margin:10vh auto;">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0">Input Nomor Resi</h6>
            <button type="button" class="btn-close btn-close-resi" aria-label="Close"></button>
          </div>
          <div class="mb-3">
            <label for="resi_courier" class="form-label text-muted">Nama Ekspedisi</label>
            <input type="text" id="resi_courier" class="form-control" placeholder="JNE / J&T / SiCepat / ...">
          </div>
          <div class="mb-3">
            <label for="resi_tracking" class="form-label text-muted">Nomor Resi</label>
            <input type="text" id="resi_tracking" class="form-control" placeholder="XXXXXXXXXXXX">
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary btn-cancel-resi">Batal</button>
            <button type="button" class="btn btn-primary btn-save-resi">
              <i class="bi bi-save"></i> Simpan
            </button>
          </div>
          <input type="hidden" id="resi_submission_id">
        </div>
      </div>
    `);
  }

  const $ = (sel) => document.querySelector(sel);
  const campaignFilter = $('#campaignFilter');
  const searchInput = $('#searchInput');
  const listWrap = $('#submission-list');
  const pager = $('#pagination');
  const refreshAllBtn = $('.btn-refresh-all');

  // ===== Helpers =====
  const toFileUrl = (input) => {
    if (!input) return null;
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

  const fmtDate = (s) => (s ? new Date(s).toLocaleDateString('id-ID') : '—');
  const fmtNum  = (n) => (n === 0 || n ? Number(n).toLocaleString('id-ID') : '—');

  const kolNameOf = (s) =>
    s.full_name ||
    (s.tiktok_username ? `@${s.tiktok_username}` : null) ||
    s.display_name ||
    s.tiktok_display_name ||
    s.name ||
    s.creator_name ||
    s.influencer_name ||
    s.user_name ||
    '—';

  const addressOf = (s) => {
    const pick = (...keys) => keys.map(k => s?.[k]).find(v => v && String(v).trim() !== '');
    const full =
      pick('full_address','address','alamat','shipping_address') ||
      [pick('address_line_1','alamat_1'), pick('address_line_2','alamat_2'), pick('city','kota'), pick('state','province','provinsi'), pick('postal_code','zip') ]
        .filter(Boolean)
        .join(', ');
    return (full && String(full).trim()) || '';
  };

  const metric = (s, slot, base) => {
    const keys = [`${base}_${slot}`, `${base}${slot}`, `${base}_${slot}_count`, `${base}${slot}_count`, base, `${base}_count`];
    for (const k of keys) if (k in s && s[k] != null) return s[k];
    return null;
  };

  // Populate campaign dropdown
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
  } catch {}

  let currentPage = 1;
  let currentCampaignId = campaignFilter.value || '';
  let currentKeyword = '';
  let debounce = null;

  async function loadSubmissions(page = 1) {
    if (!currentCampaignId) {
      listWrap.innerHTML = `<div class="alert alert-info">Silakan pilih <b>Campaign</b> terlebih dahulu.</div>`;
      pager.innerHTML = '';
      hideLoader();
      return;
    }

    showLoader();
    try {
      const res = await submissionService.getAll({
        page,
        per_page: 20,
        include: 'campaign',
        campaign_id: currentCampaignId
      });

      const arr = res?.data || [];

      // Filter keyword (nama, open_id, link_1..5, alamat)
      const kw = (currentKeyword || '').toLowerCase().trim();
      const filtered = kw
        ? arr.filter(s => {
            const name = kolNameOf(s);
            const addr = addressOf(s);
            const hay = [
              name,
              addr,
              s.tiktok_user_id || '',
              s.link_1 || '', s.link_2 || '', s.link_3 || '', s.link_4 || '', s.link_5 || '',
            ].join(' ').toLowerCase();
            return hay.includes(kw);
          })
        : arr;

      // Group per open_id
      const groups = new Map();
      filtered.forEach((s) => {
        const key = s.tiktok_user_id || `anon:${kolNameOf(s)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(s);
      });

      const btn = (u, label='View') =>
        u ? `<a class="btn btn-sm btn-outline-secondary" href="${u}" target="_blank" rel="noopener">${label}</a>` : '<span class="text-muted">—</span>';

      const rowsHtml = [];

      for (const [_openId, subs] of groups.entries()) {
        const first = subs[0] || {};
        const displayName = kolNameOf(first);
        const addr = addressOf(first);
        const avatar = first.profile_pic_url ? `<img src="${first.profile_pic_url}" alt="" style="width:28px;height:28px;border-radius:50%;object-fit:cover">` : '';
        const firstSubmissionId = first.id;

        // Kondisi tombol "Input Resi"
        const isSentByBrand = (first.acquisition_method === 'sent_by_brand');
        const hasResi = !!(first.shipping_tracking_number || first.shipping_courier);
        const resiBtnHtml = isSentByBrand ? `
          <button class="btn btn-sm btn-outline-success btn-input-resi"
                  data-id="${firstSubmissionId}"
                  data-courier="${first.shipping_courier ? String(first.shipping_courier).replace(/"/g,'&quot;') : ''}"
                  data-resi="${first.shipping_tracking_number ? String(first.shipping_tracking_number).replace(/"/g,'&quot;') : ''}">
            <i class="bi bi-truck"></i> ${hasResi ? 'Ubah Resi' : 'Isi Resi'}
          </button>
        ` : '';

        // Header per KOL: nama + alamat (kecil) + tombol aksi
        rowsHtml.push(`
          <tr>
            <td colspan="9">
              <div class="d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-start gap-2">
                  ${avatar}
                  <div>
                    <div class="fw-semibold">${displayName}</div>
                    ${addr ? `<div class="text-muted small">${addr}</div>` : ''}
                  </div>
                </div>
                <div class="d-flex flex-wrap gap-2">
                  ${resiBtnHtml}
                  <button class="btn btn-sm btn-outline-primary app-link" data-href="/admin/submissions/${firstSubmissionId}/edit">
                    <i class="bi bi-pencil"></i> Edit
                  </button>
                  <button class="btn btn-sm btn-outline-secondary btn-refresh-metrics" data-id="${firstSubmissionId}">
                    <i class="bi bi-arrow-clockwise"></i> Refresh
                  </button>
                </div>
              </div>
            </td>
          </tr>
        `);

        subs.forEach((s) => {
          // Row generator konten 1..5 (tanpa kolom Content & Aksi)
          const slotRow = (slot, s) => {
            const link   = s[`link_${slot}`] || '';
            const pdate  = s[`post_date_${slot}`];
            const scPath = s[`screenshot_${slot}_url`] || s[`screenshot_${slot}_path`];
            const scUrl  = toFileUrl(scPath);

            const invUrl = toFileUrl(s.invoice_file_url || s.invoice_file_path);
            const revUrl = toFileUrl(s.review_proof_file_url || s.review_proof_file_path);

            const views    = metric(s, slot, 'views')    ?? metric(s, slot, 'view');
            const likes    = metric(s, slot, 'likes')    ?? metric(s, slot, 'like');
            const comments = metric(s, slot, 'comments') ?? metric(s, slot, 'comment');
            const shares   = metric(s, slot, 'shares')   ?? metric(s, slot, 'share');

            if (!link && !pdate && !scUrl) return '';

            return `
              <tr ${slot === 1 ? `data-submission-id="${s.id}"` : ''}>
                <td>${link ? `<a href="${link}" target="_blank" rel="noopener">${link}</a>` : '<span class="text-muted">—</span>'}</td>
                <td>${fmtDate(pdate)}</td>
                <td>${btn(scUrl, 'View')}</td>
                <td>${btn(invUrl, 'Invoice')}</td>
                <td>${btn(revUrl, 'Review')}</td>
                <td class="text-end">${fmtNum(views)}</td>
                <td class="text-end">${fmtNum(likes)}</td>
                <td class="text-end">${fmtNum(comments)}</td>
                <td class="text-end">${fmtNum(shares)}</td>
              </tr>
            `;
          };

          [1,2,3,4,5].forEach(slot => {
            const html = slotRow(slot, s);
            if (html) rowsHtml.push(html);
          });
        });
      }

      const tableHtml = `
        <table class="table table-bordered bg-white">
          <thead>
            <tr><th colspan="9" class="text-uppercase">Submissions</th></tr>
            <tr>
              <th style="min-width:260px">Link</th>
              <th style="width:120px">Tanggal</th>
              <th style="width:120px">Screenshot</th>
              <th style="width:120px">Invoice</th>
              <th style="width:120px">Review</th>
              <th style="width:100px" class="text-end">Views</th>
              <th style="width:100px" class="text-end">Likes</th>
              <th style="width:110px" class="text-end">Comments</th>
              <th style="width:100px" class="text-end">Shares</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml.filter(Boolean).join('') || `
              <tr><td colspan="9" class="text-center text-muted">Tidak ada data.</td></tr>
            `}
          </tbody>
        </table>
      `;

      listWrap.innerHTML = tableHtml;

      // Pagination
      pager.innerHTML = '';
      if (res?.last_page > 1) {
        for (let i = 1; i <= res.last_page; i++) {
          const li = document.createElement('li');
          li.className = `page-item ${i === res.current_page ? 'active' : ''}`;
          li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
          li.addEventListener('click', (e) => {
            e.preventDefault();
            currentPage = i;
            loadSubmissions(currentPage);
          });
          pager.appendChild(li);
        }
      }

      attachActionHandlers();

    } catch (err) {
      console.error(err);
      listWrap.innerHTML = `<div class="text-danger">Gagal memuat submissions.</div>`;
    } finally {
      hideLoader();
    }
  }

  // ===== Modal helpers (Input Resi)
  const resiModal     = document.getElementById('resiModal');
  const resiCourierEl = document.getElementById('resi_courier');
  const resiTrackEl   = document.getElementById('resi_tracking');
  const resiIdEl      = document.getElementById('resi_submission_id');
  const resiBtnSave   = document.querySelector('#resiModal .btn-save-resi');
  const resiBtnCancel = document.querySelector('#resiModal .btn-cancel-resi');
  const resiBtnClose  = document.querySelector('#resiModal .btn-close-resi');

  function openResiModal({ id, courier = '', tracking = '' } = {}) {
    if (!resiModal) return;
    resiIdEl.value = id || '';
    resiCourierEl.value = courier || '';
    resiTrackEl.value = tracking || '';
    resiModal.classList.remove('d-none');
    setTimeout(() => (resiCourierEl?.focus?.()), 50);
  }
  function closeResiModal() {
    if (!resiModal) return;
    resiModal.classList.add('d-none');
    resiIdEl.value = '';
    resiCourierEl.value = '';
    resiTrackEl.value = '';
  }

  // close events
  resiBtnCancel?.addEventListener('click', closeResiModal);
  resiBtnClose?.addEventListener('click', closeResiModal);
  // close on backdrop click
  resiModal?.addEventListener('click', (e) => {
    if (e.target === resiModal) closeResiModal();
  });

  // save event
  resiBtnSave?.addEventListener('click', async () => {
    const id = resiIdEl.value;
    const courier = (resiCourierEl.value || '').trim();
    const tracking = (resiTrackEl.value || '').trim();

    if (!id) { showToast('ID submission tidak valid.', 'error'); return; }
    if (!courier || !tracking) { showToast('Nama ekspedisi dan nomor resi wajib diisi.', 'error'); return; }

    const oldHtml = resiBtnSave.innerHTML;
    resiBtnSave.disabled = true;
    resiBtnSave.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Simpan`;

    try {
      const fd = new FormData();
      fd.set('_method', 'PATCH');
      fd.set('shipping_courier', courier);
      fd.set('shipping_tracking_number', tracking);

      if (submissionService?.update) {
        await submissionService.update(id, fd);
      } else {
        const r = await fetch(`/api/influencer-submissions/${id}`, {
          method: 'POST',
          credentials: 'same-origin',
          body: fd,
        });
        if (!r.ok) throw new Error('Gagal menyimpan resi');
        await r.json();
      }

      showToast('Resi berhasil disimpan');
      closeResiModal();
      await loadSubmissions(currentPage);
    } catch (err) {
      showToast(err?.message || 'Gagal menyimpan resi', 'error');
    } finally {
      resiBtnSave.disabled = false;
      resiBtnSave.innerHTML = oldHtml;
    }
  });

  function attachActionHandlers() {
    // navigasi app-link
    document.querySelectorAll('.app-link').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const href = el.getAttribute('data-href');
        if (!href) return;
        history.pushState(null, '', href);
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
    });

    // refresh per submission
    document.querySelectorAll('.btn-refresh-metrics').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-id');
        const old = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Refresh`;

        try {
          const resp = await submissionService.refreshMetrics(id);
          showToast(resp?.message || 'Metrik berhasil di-refresh.');
          await loadSubmissions(currentPage);
        } catch (err) {
          if ((err?.status === 401 || err?.status === 409) && err?.reauth_url) {
            showToast(err?.message || 'Token TikTok tidak valid. Silakan connect ulang.', 'error');
          } else {
            showToast(err?.message || 'Gagal refresh metrik', 'error');
          }
        } finally {
          btn.disabled = false;
          btn.innerHTML = old;
        }
      });
    });

    // open resi modal
    document.querySelectorAll('.btn-input-resi').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-id');
        const courier = btn.getAttribute('data-courier') || '';
        const resi = btn.getAttribute('data-resi') || '';
        openResiModal({ id, courier, tracking: resi });
      });
    });

    // refresh semua yang terlihat
    if (refreshAllBtn) {
      refreshAllBtn.onclick = async () => {
        const ids = Array.from(document.querySelectorAll('tr[data-submission-id]'))
          .map(tr => tr.getAttribute('data-submission-id'))
          .filter(Boolean);

        if (!ids.length) {
          showToast('Tidak ada baris untuk di-refresh.', 'error');
          return;
        }

        const old = refreshAllBtn.innerHTML;
        refreshAllBtn.disabled = true;
        refreshAllBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Refreshing…`;

        let ok = 0, fail = 0;
        for (const id of ids) {
          try {
            await submissionService.refreshMetrics(id);
            ok++;
          } catch {
            fail++;
          }
        }

        await loadSubmissions(currentPage);
        refreshAllBtn.disabled = false;
        refreshAllBtn.innerHTML = old;

        showToast(`Refresh selesai: ${ok} sukses, ${fail} gagal.`);
      };
    }
  }

  campaignFilter.addEventListener('change', () => {
    currentCampaignId = campaignFilter.value || '';
    currentPage = 1;
    loadSubmissions(currentPage);
  });

  searchInput.addEventListener('input', (e) => {
    currentKeyword = e.target.value;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      currentPage = 1;
      loadSubmissions(currentPage);
    }, 250);
  });

  if (campaignFilter.value) {
    currentCampaignId = campaignFilter.value;
    loadSubmissions(currentPage);
  } else {
    hideLoader();
  }
}
