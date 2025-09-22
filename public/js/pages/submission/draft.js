// /js/pages/admin/drafts-list.js
export async function render(target, path, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();

  const [
    headerMod,
    breadcrumbMod,
    loaderMod,
    toastMod,
    campaignMod,
  ] = await Promise.all([
    import(`../../components/header.js?v=${v}`),
    import(`../../components/breadcrumb.js?v=${v}`),
    import(`../../components/loader.js?v=${v}`),
    import(`../../utils/toast.js?v=${v}`),
    import(`../../services/campaignService.js?v=${v}`),
  ]);

  const { renderHeader } = headerMod;
  const { renderBreadcrumb } = breadcrumbMod;
  const { showLoader, hideLoader } = loaderMod;
  const { showToast } = toastMod;
  const { campaignService } = campaignMod;

  // ---------- helpers ----------
  const $ = (sel) => document.querySelector(sel);

  // Inline SVG placeholder (no network fetch)
  const DUMMY_AVATAR_DATA_URI = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
      <rect width="100%" height="100%" fill="#f1f3f5"/>
      <circle cx="36" cy="28" r="14" fill="#dee2e6"/>
      <rect x="12" y="46" width="48" height="18" rx="9" fill="#dee2e6"/>
    </svg>
  `);

  function avatarTag(url) {
    if (!url || !String(url).trim()) {
      return `<img src="${DUMMY_AVATAR_DATA_URI}" alt=""
                loading="lazy" decoding="async" fetchpriority="low" referrerpolicy="no-referrer"
                style="width:36px;height:36px;border-radius:50%;object-fit:cover">`;
    }
    const safe = String(url).replace(/"/g, '&quot;');
    const dummy = DUMMY_AVATAR_DATA_URI.replace(/"/g, '&quot;');
    return `<img src="${safe}" alt=""
              onerror="this.onerror=null;this.src='${dummy}'"
              loading="lazy" decoding="async" fetchpriority="low" referrerpolicy="no-referrer"
              style="width:36px;height:36px;border-radius:50%;object-fit:cover">`;
  }

  const kolNameOf = (inf = {}) =>
    inf.tiktok_full_name ||
    (inf.tiktok_username ? `@${inf.tiktok_username}` : null) ||
    inf.name ||
    '—';

  const kolAvatarOf = (inf = {}) =>
    inf.tiktok_avatar_url ||
    inf.avatar_url ||
    inf.profile_pic_url ||
    null;

  const addressOf = (inf = {}) => {
    const pick = (...keys) => keys.map(k => inf?.[k]).find(v => v && String(v).trim() !== '');
    const full =
      pick('address','full_address','shipping_address') ||
      [pick('address_line_1'), pick('address_line_2'), pick('city'), pick('state','province'), pick('postal_code','zip')]
        .filter(Boolean)
        .join(', ');
    return (full && String(full).trim()) || '';
  };

  const fmtDateTime = (s) => (s ? new Date(s).toLocaleString('id-ID') : '—');

  const statusToUi = (raw) => {
    const s = String(raw || '').toLowerCase();
    if (s === 'pending')  return { text: 'Waiting for Approval', badge: 'warning' };
    if (s === 'approved') return { text: 'Approve',             badge: 'success' };
    if (s === 'rejected') return { text: 'Need to Revise',       badge: 'danger'  };
    return { text: '-', badge: 'secondary' };
  };

  // fixed width badge (rapih untuk semua status)
  const BADGE_WIDTH = 140; // px
  function badgeForStatus(status) {
    const { text, badge } = statusToUi(status);
    return `
      <span class="badge bg-${badge} d-inline-block text-center"
            style="width:${BADGE_WIDTH}px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
        ${text}
      </span>`;
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

  // ---------- DOM refs ----------
  const campaignFilter = $('#campaignFilter');
  const searchInput = $('#searchInput');
  const listWrap = $('#draft-list');
  const pager = $('#pagination');
  const refreshAllBtn = $('.btn-refresh-all');

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

  // ---------- API ----------
  async function fetchDraftsWithInfluencer({ page = 1, per_page = 20, campaign_id, q = '' }) {
    const qs = new URLSearchParams({
      page: String(page),
      per_page: String(per_page),
      campaign_id: String(campaign_id || ''),
    });
    if (q) qs.set('q', q);
    const url = `/api/influencer-submissions/draft/with-influencer?${qs.toString()}`;
    const r = await fetchWithCsrf(url, { method: 'GET' });
    if (!r.ok) throw new Error('Gagal memuat data draft');
    return r.json();
  }

  // Kirim 2 reviewer note terpisah
  async function updateDraftApprovalInline(draftId, { status, note1, note2 }) {
    const r = await fetchWithCsrf(`/api/influencer-submissions/draft/${encodeURIComponent(draftId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: String(status || 'pending').toLowerCase(),
        reviewer_note_1: note1 ?? null,
        reviewer_note_2: note2 ?? null,
        reviewer_note: null, // legacy field dimatikan
      })
    });
    if (!r.ok) {
      let msg = 'Gagal menyimpan approval.';
      try { const j = await r.json(); msg = j?.message || msg; } catch {}
      throw new Error(msg);
    }
    return r.json();
  }

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
      const res = await fetchDraftsWithInfluencer({
        page,
        per_page: 20,
        campaign_id: currentCampaignId,
        q: currentKeyword.trim(),
      });

      const rows = Array.isArray(res?.data) ? res.data : (res?.data?.data || []); // support both paginator styles
      // Group by influencer open_id
      const groups = new Map();
      for (const d of rows) {
        const inf = d.influencer || {};
        const key = inf.open_id || d.submission?.tiktok_user_id || `anon:${kolNameOf(inf)}`;
        if (!groups.has(key)) groups.set(key, { inf, drafts: [] });
        groups.get(key).drafts.push(d);
      }

      // Build HTML
      const blocks = [];
      if (groups.size === 0) {
        blocks.push(`<div class="text-center text-muted">Tidak ada draft untuk campaign ini.</div>`);
      } else {
        for (const [, { inf, drafts }] of groups.entries()) {
          // influencer header
          const name = kolNameOf(inf);
          const addr = addressOf(inf);
          const avatarHtml = avatarTag(kolAvatarOf(inf));

          // sort drafts by slot asc then updated desc
          drafts.sort((a, b) => {
            const sa = Number(a.slot || 0), sb = Number(b.slot || 0);
            if (sa !== sb) return sa - sb;
            const ta = new Date(a.updated_at || a.submitted_at || 0).getTime();
            const tb = new Date(b.updated_at || b.submitted_at || 0).getTime();
            return tb - ta;
          });

          const draftRows = drafts.map(d => {
            const link = d.url || '';
            const hasLink = !!(link && link.trim());
            const updated = fmtDateTime(d.updated_at || d.submitted_at);
            const note1Val = (d.reviewer_note_1 ?? d.reviewer_note ?? '').replace(/"/g,'&quot;');
            const note2Val = (d.reviewer_note_2 ?? '').replace(/"/g,'&quot;');

            return `
              <tr data-draft-id="${d.id}">
                <td class="text-center" style="width:70px">${Number(d.slot) || '-'}</td>
                <td style="width:160px">
                  ${
                    hasLink
                      ? `<a class="btn btn-sm btn-outline-secondary w-100 text-truncate" title="${link.replace(/"/g,'&quot;')}"
                            href="${link}" target="_blank" rel="noopener">
                            <i class="bi bi-box-arrow-up-right"></i> Open Draft
                         </a>`
                      : '<span class="text-muted">—</span>'
                  }
                </td>
                <td style="width:${BADGE_WIDTH + 20}px">
                  ${badgeForStatus(d.status)}
                </td>
                <td style="width:200px">
                  <select class="form-select form-select-sm js-status">
                    <option value="pending"  ${d.status==='pending'?'selected':''}>Waiting for Approval</option>
                    <option value="approved" ${d.status==='approved'?'selected':''}>Approve</option>
                    <option value="rejected" ${d.status==='rejected'?'selected':''}>Need to Revise</option>
                  </select>
                </td>
                <td style="min-width:220px">
                  <input type="text" class="form-control form-control-sm js-note-1"
                         placeholder="Reviewer Note #1…" value="${note1Val}">
                </td>
                <td style="min-width:220px">
                  <input type="text" class="form-control form-control-sm js-note-2"
                         placeholder="Reviewer Note #2…" value="${note2Val}">
                </td>
                <td style="width:160px" class="text-muted small">${updated}</td>
                <td style="width:130px" class="text-end">
                  <button class="btn btn-sm btn-outline-primary js-save">
                    <i class="bi bi-check2-circle"></i> Simpan
                  </button>
                </td>
              </tr>
            `;
          }).join('');

          blocks.push(`
            <div class="card mb-3">
              <div class="card-header bg-white">
                <div class="d-flex align-items-center gap-2">
                  ${avatarHtml}
                  <div>
                    <div class="fw-semibold">${name}</div>
                    ${addr ? `<div class="text-muted small">${addr}</div>` : ''}
                  </div>
                </div>
              </div>
              <div class="card-body p-0">
                <div class="table-responsive">
                  <table class="table mb-0">
                    <thead>
                      <tr class="table-light">
                        <th style="width:70px" class="text-center">Slot</th>
                        <th style="width:160px">Draft</th>
                        <th style="width:${BADGE_WIDTH + 20}px">Status</th>
                        <th style="width:200px">Action</th>
                        <th style="min-width:220px">Reviewer Note (Brand)</th>
                        <th style="min-width:220px">Reviewer Note (Dream)</th>
                        <th style="width:160px">Updated</th>
                        <th style="width:130px"></th>
                      </tr>
                    </thead>
                    <tbody>
                      ${draftRows}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          `);
        }
      }

      listWrap.innerHTML = blocks.join('');

      // Pagination UI (Laravel paginator)
      const current = res.current_page ?? res?.data?.current_page ?? 1;
      const last = res.last_page ?? res?.data?.last_page ?? 1;
      pager.innerHTML = '';
      if (last > 1) {
        for (let i = 1; i <= last; i++) {
          const li = document.createElement('li');
          li.className = `page-item ${i === current ? 'active' : ''}`;
          li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
          li.addEventListener('click', (e) => {
            e.preventDefault();
            currentPage = i;
            loadDrafts(currentPage);
          });
          pager.appendChild(li);
        }
      }

      attachInlineHandlers();

    } catch (err) {
      console.error(err);
      listWrap.innerHTML = `<div class="text-danger">Gagal memuat draft.</div>`;
      pager.innerHTML = '';
    } finally {
      hideLoader();
    }
  }

  // ---------- inline handlers ----------
  function attachInlineHandlers() {
    listWrap.querySelectorAll('tr[data-draft-id]').forEach(tr => {
      const draftId = tr.getAttribute('data-draft-id');
      const statusSel = tr.querySelector('.js-status');
      const note1El = tr.querySelector('.js-note-1');
      const note2El = tr.querySelector('.js-note-2');
      const saveBtn = tr.querySelector('.js-save');

      // Enter di input note#1 / note#2 => trigger simpan
      const enterToSave = (el) => el?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); saveBtn?.click(); }
      });
      enterToSave(note1El);
      enterToSave(note2El);

      saveBtn?.addEventListener('click', async () => {
        const status = statusSel?.value || 'pending';
        const note1 = (note1El?.value || '').trim();
        const note2 = (note2El?.value || '').trim();
        const old = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Simpan…`;
        try {
          await updateDraftApprovalInline(draftId, { status, note1, note2 });
          showToast('Approval tersimpan.');
          await loadDrafts(currentPage);
        } catch (e) {
          showToast(e?.message || 'Gagal menyimpan approval', 'error');
        } finally {
          saveBtn.disabled = false;
          saveBtn.innerHTML = old;
        }
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
