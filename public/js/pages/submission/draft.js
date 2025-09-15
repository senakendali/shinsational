// /js/pages/admin/drafts-list.js
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

  const kolAvatarOf = (s) =>
    s.avatar_url ||
    s.profile_pic_url ||
    s.tiktok_avatar_url ||
    s.influencer_avatar_url ||
    s.photo_url ||
    null;

  const addressOf = (s) => {
    const pick = (...keys) => keys.map(k => s?.[k]).find(v => v && String(v).trim() !== '');
    const full =
      pick('full_address','address','alamat','shipping_address') ||
      [pick('address_line_1','alamat_1'), pick('address_line_2','alamat_2'), pick('city','kota'), pick('state','province','provinsi'), pick('postal_code','zip')]
        .filter(Boolean)
        .join(', ');
    return (full && String(full).trim()) || '';
  };

  const fmtDateTime = (s) => (s ? new Date(s).toLocaleString('id-ID') : '—');

  function badgeForStatus(status) {
    const map = { pending: 'warning', approved: 'success', rejected: 'danger' };
    const b = map[(status || '').toLowerCase()] || 'secondary';
    return `<span class="badge bg-${b}">${(status || '-').toUpperCase()}</span>`;
  }

  function getCsrfToken() {
    const m = document.querySelector('meta[name="csrf-token"]');
    if (m?.content) return m.content;
    const xsrf = document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('XSRF-TOKEN='));
    if (!xsrf) return '';
    try { return decodeURIComponent(xsrf.split('=')[1]); } catch { return ''; }
  }

  async function fetchWithCsrf(input, init = {}) {
    const headers = new Headers(init.headers || {});
    headers.set('X-Requested-With', 'XMLHttpRequest');
    const token = getCsrfToken();
    if (token) headers.set('X-CSRF-TOKEN', token);
    return fetch(input, { ...init, headers, credentials: 'same-origin' });
  }

  // ---------- mount skeleton ----------
  showLoader();
  target.innerHTML = '';

  renderHeader('header');
  renderBreadcrumb(target, path, labelOverride);

  target.innerHTML += `
    <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <select id="campaignFilter" class="form-select" style="min-width:260px">
          <option value="">— Pilih Campaign —</option>
        </select>
        <input class="form-control" style="min-width:260px" type="search" placeholder="Cari KOL / open_id / link…" id="searchInput">
      </div>
      <div class="d-flex align-items-center gap-2 flex-wrap">
        <button class="btn btn-outline-secondary btn-refresh-all" type="button">
          <i class="bi bi-arrow-clockwise"></i> Refresh visible
        </button>
      </div>
    </div>

    <div id="draft-list"></div>

    <nav class="mt-3">
      <ul class="pagination" id="pagination"></ul>
    </nav>
  `;

  // ---------- inject Approval Modal ----------
  if (!document.getElementById('draftApprovalModal')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="draftApprovalModal" class="position-fixed top-0 start-0 w-100 h-100 d-none"
           style="background:rgba(0,0,0,.35); z-index:2000;">
        <div class="bg-white rounded shadow p-3" style="max-width:560px; width:92%; margin:8vh auto;">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0">Approval Draft</h6>
            <button type="button" class="btn-close btn-close-approval" aria-label="Close"></button>
          </div>

          <div class="mb-2 small text-muted" id="draftKolInfo">—</div>
          <div class="mb-3">
            <label class="form-label text-muted">Link Draft</label>
            <div>
              <a href="#" id="draftApprovalLink" target="_blank" rel="noopener">—</a>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label text-muted">Status</label>
            <select id="draftApprovalStatus" class="form-select">
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label text-muted">Catatan Reviewer (opsional)</label>
            <textarea id="draftApprovalNote" class="form-control" rows="3" placeholder="Tuliskan catatan untuk KOL…"></textarea>
          </div>

          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary btn-cancel-approval">Batal</button>
            <button type="button" class="btn btn-primary btn-save-approval">
              <i class="bi bi-check2-circle"></i> Simpan Approval
            </button>
          </div>

          <input type="hidden" id="draftApprovalSubmissionId">
        </div>
      </div>
    `);
  }

  // ---------- DOM refs ----------
  const campaignFilter = $('#campaignFilter');
  const searchInput = $('#searchInput');
  const listWrap = $('#draft-list');
  const pager = $('#pagination');
  const refreshAllBtn = $('.btn-refresh-all');

  // approval modal refs
  const approvalModal = $('#draftApprovalModal');
  const approvalClose = approvalModal?.querySelector('.btn-close-approval');
  const approvalCancel = approvalModal?.querySelector('.btn-cancel-approval');
  const approvalSave = approvalModal?.querySelector('.btn-save-approval');
  const approvalIdEl = $('#draftApprovalSubmissionId');
  const approvalStatusEl = $('#draftApprovalStatus');
  const approvalNoteEl = $('#draftApprovalNote');
  const approvalLinkEl = $('#draftApprovalLink');
  const approvalKolInfoEl = $('#draftKolInfo');

  // ---------- state ----------
  let currentPage = 1;
  let currentCampaignId = '';
  let currentKeyword = '';
  let debounce = null;

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
  } catch {}

  // ---------- modal helpers ----------
  function openApprovalModal({ id, kolName = '—', draftUrl = '#', status = 'pending', note = '' } = {}) {
    if (!approvalModal) return;
    approvalIdEl.value = id || '';
    approvalStatusEl.value = (status || 'pending').toLowerCase();
    approvalNoteEl.value = note || '';
    approvalLinkEl.href = draftUrl || '#';
    approvalLinkEl.textContent = draftUrl || '—';
    approvalKolInfoEl.textContent = kolName || '—';

    approvalModal.classList.remove('d-none');
  }
  function closeApprovalModal() {
    if (!approvalModal) return;
    approvalModal.classList.add('d-none');
    approvalIdEl.value = '';
    approvalNoteEl.value = '';
    approvalLinkEl.href = '#';
    approvalLinkEl.textContent = '—';
    approvalKolInfoEl.textContent = '—';
    approvalStatusEl.value = 'pending';
  }

  approvalClose?.addEventListener('click', closeApprovalModal);
  approvalCancel?.addEventListener('click', closeApprovalModal);
  approvalModal?.addEventListener('click', (e) => {
    if (e.target === approvalModal) closeApprovalModal();
  });

  // SAVE approval -> endpoint khusus
  approvalSave?.addEventListener('click', async () => {
    const id = approvalIdEl.value;
    if (!id) { showToast('ID submission tidak valid.', 'error'); return; }

    const status = (approvalStatusEl.value || 'pending').toLowerCase();
    const note = (approvalNoteEl.value || '').trim();

    const old = approvalSave.innerHTML;
    approvalSave.disabled = true;
    approvalSave.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan…`;

    try {
      const fd = new FormData();
      fd.set('draft_status', status);
      if (note) fd.set('draft_reviewer_note', note);

      const r = await fetchWithCsrf(`/api/influencer-submissions/${encodeURIComponent(id)}/draft-approval`, {
        method: 'POST',
        body: fd,
      });
      if (!r.ok) {
        let msg = 'Gagal menyimpan approval.';
        try { const j = await r.json(); msg = j?.message || msg; } catch {}
        throw new Error(msg);
      }
      await r.json().catch(()=>{});

      showToast('Approval tersimpan.');
      closeApprovalModal();
      await loadDrafts(currentPage);
    } catch (err) {
      showToast(err?.message || 'Gagal menyimpan approval', 'error');
    } finally {
      approvalSave.disabled = false;
      approvalSave.innerHTML = old;
    }
  });

  // ---------- list loader ----------
  async function loadDrafts(page = 1) {
    currentCampaignId = campaignFilter.value || '';
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
        campaign_id: currentCampaignId,
      });

      const arrRaw = res?.data || [];

      // Hanya yang punya draft_url
      let arr = arrRaw.filter(s => !!(s.draft_url && String(s.draft_url).trim() !== ''));

      // Filter keyword (nama, open_id, username, draft_url)
      const kw = (currentKeyword || '').toLowerCase().trim();
      if (kw) {
        arr = arr.filter(s => {
          const name = kolNameOf(s);
          const uname = s.tiktok_username ? '@' + s.tiktok_username : '';
          const hay = [
            name,
            uname,
            s.tiktok_user_id || '',
            s.draft_url || '',
          ].join(' ').toLowerCase();
        return hay.includes(kw);
        });
      }

      // Group by open_id & ambil terbaru per KOL (draft_submitted_at || updated_at || created_at)
      const groups = new Map();
      const ts = (s) => new Date(s.draft_submitted_at || s.updated_at || s.created_at || 0).getTime();

      for (const s of arr) {
        const key = s.tiktok_user_id || `anon:${kolNameOf(s)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(s);
      }

      const latestByKol = [];
      for (const [_openId, items] of groups.entries()) {
        items.sort((a, b) => ts(b) - ts(a));
        latestByKol.push(items[0]);
      }

      // Build rows
      const rowsHtml = [];

      for (const s of latestByKol) {
        const displayName = kolNameOf(s);
        const addr = addressOf(s);
        const avatarUrl = kolAvatarOf(s);
        const avatar = avatarUrl ? `<img src="${avatarUrl}" alt="" style="width:28px;height:28px;border-radius:50%;object-fit:cover">` : '';
        const draftUrl = s.draft_url || '';
        const statusHtml = badgeForStatus(s.draft_status || 'pending');
        const updated = fmtDateTime(s.draft_submitted_at || s.updated_at || s.created_at);

        // Header per KOL: avatar + nama + alamat + tombol Approval
        rowsHtml.push(`
          <tr>
            <td colspan="3">
              <div class="d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-start gap-2">
                  ${avatar}
                  <div>
                    <div class="fw-semibold">${displayName}</div>
                    ${addr ? `<div class="text-muted small">${addr}</div>` : ''}
                  </div>
                </div>
                <div class="d-flex flex-wrap gap-2">
                  <button class="btn btn-sm btn-outline-primary btn-approve-draft"
                          data-id="${s.id}"
                          data-name="${(displayName || '').replace(/"/g,'&quot;')}"
                          data-url="${(draftUrl || '').replace(/"/g,'&quot;')}"
                          data-status="${(s.draft_status || 'pending').replace(/"/g,'&quot;')}"
                          data-note="${(s.draft_reviewer_note || '').replace(/"/g,'&quot;')}">
                    <i class="bi bi-check2-circle"></i> Approval
                  </button>
                </div>
              </div>
            </td>
          </tr>
        `);

        // Baris konten tunggal: link draft + status + updated_at
        rowsHtml.push(`
          <tr data-submission-id="${s.id}">
            <td style="min-width:360px">
              ${draftUrl ? `<a href="${draftUrl}" target="_blank" rel="noopener">${draftUrl}</a>` : '<span class="text-muted">—</span>'}
            </td>
            <td style="width:180px">${statusHtml}</td>
            <td style="width:220px" class="text-muted small">${updated}</td>
          </tr>
        `);
      }

      const tableHtml = `
        <table class="table table-bordered bg-white">
          <thead>
            <tr><th colspan="3" class="text-uppercase">Draft Content</th></tr>
            <tr>
              <th>Draft Link</th>
              <th style="width:180px">Status</th>
              <th style="width:220px">Updated</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml.filter(Boolean).join('') || `
              <tr><td colspan="3" class="text-center text-muted">Tidak ada draft untuk campaign ini.</td></tr>
            `}
          </tbody>
        </table>
      `;

      listWrap.innerHTML = tableHtml;

      // Pagination UI dari backend
      pager.innerHTML = '';
      if (res?.last_page > 1) {
        for (let i = 1; i <= res.last_page; i++) {
          const li = document.createElement('li');
          li.className = `page-item ${i === res.current_page ? 'active' : ''}`;
          li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
          li.addEventListener('click', (e) => {
            e.preventDefault();
            currentPage = i;
            loadDrafts(currentPage);
          });
          pager.appendChild(li);
        }
      }

      attachRowHandlers();

    } catch (err) {
      console.error(err);
      listWrap.innerHTML = `<div class="text-danger">Gagal memuat draft.</div>`;
    } finally {
      hideLoader();
    }
  }

  function attachRowHandlers() {
    document.querySelectorAll('.btn-approve-draft').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name') || '—';
        const url = btn.getAttribute('data-url') || '#';
        const status = btn.getAttribute('data-status') || 'pending';
        const note = btn.getAttribute('data-note') || '';
        openApprovalModal({ id, kolName: name, draftUrl: url, status, note });
      });
    });
  }

  // ---------- top controls ----------
  campaignFilter.addEventListener('change', () => {
    currentPage = 1;
    loadDrafts(currentPage);
  });

  searchInput.addEventListener('input', (e) => {
    currentKeyword = e.target.value;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      currentPage = 1;
      loadDrafts(currentPage);
    }, 250);
  });

  refreshAllBtn?.addEventListener('click', () => loadDrafts(currentPage));

  // ---------- init ----------
  if (campaignFilter.value) {
    loadDrafts(currentPage);
  } else {
    hideLoader();
  }
}
