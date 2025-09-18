// /js/pages/kol/kol-list.js
export async function render(target, path, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();

  const [
    headerMod,
    breadcrumbMod,
    loaderMod,
    toastMod,
    campaignMod,
    submissionMod
  ] = await Promise.all([
    import(`../../components/header.js?v=${v}`),
    import(`../../components/breadcrumb.js?v=${v}`),
    import(`../../components/loader.js?v=${v}`),
    import(`../../utils/toast.js?v=${v}`),
    import(`../../services/campaignService.js?v=${v}`),
    import(`../../services/influencerSubmissionService.js?v=${v}`), // fallback filter by campaign via submissions
  ]);

  // influencerAccountService is optional; try import, else fallback
  let accountServiceMod = null;
  try {
    accountServiceMod = await import(`../../services/influencerAccountService.js?v=${v}`);
  } catch (e) {
    // no-op: we'll use local fallback
  }

  const { renderHeader } = headerMod;
  const { renderBreadcrumb } = breadcrumbMod;
  const { showLoader, hideLoader } = loaderMod;
  const { showToast } = toastMod;
  const { campaignService } = campaignMod;
  const { submissionService } = submissionMod;

  // === CSRF helpers (for SPA using web/session guard) ===
  function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content || window.CSRF_TOKEN || '';
  }
  function setCsrfToken(t) {
    const m = document.querySelector('meta[name="csrf-token"]');
    if (m) m.setAttribute('content', t);
    window.CSRF_TOKEN = t;
  }
  async function refreshCsrf() {
    const r = await fetch('/api/csrf/refresh', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': getCsrfToken()
      },
    });
    if (r.ok) {
      const j = await r.json().catch(() => null);
      if (j?.token) setCsrfToken(j.token);
    }
  }
  async function csrfFetch(input, init = {}) {
    const headers = Object.assign({
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': getCsrfToken(),
    }, init.headers || {});
    const opts = Object.assign({ credentials: 'same-origin' }, init, { headers });

    let res = await fetch(input, opts);
    if (res.status === 419) {
      // refresh CSRF then retry once
      await refreshCsrf();
      opts.headers['X-CSRF-TOKEN'] = getCsrfToken();
      res = await fetch(input, opts);
    }
    return res;
  }

  const influencerAccountService = accountServiceMod?.influencerAccountService || {
    async getAll(params = {}) {
      const qs = new URLSearchParams();
      if (params.page) qs.set('page', params.page);
      if (params.per_page) qs.set('per_page', params.per_page);
      if (params.campaign_id) qs.set('campaign_id', params.campaign_id);
      if (params.q) qs.set('q', params.q);
      const url = `/api/influencer-accounts?${qs.toString()}`;
      const r = await fetch(url, { credentials: 'same-origin' });
      if (!r.ok) throw await r.json().catch(() => new Error('Gagal load KOL'));
      return r.json();
    },
    async refreshToken(id) {
      const r = await csrfFetch(`/api/influencer-accounts/${id}/refresh-token`, {
        method: 'POST',
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        const e = new Error(err?.message || 'Gagal refresh token');
        e.status = r.status; e.payload = err;
        throw e;
      }
      return r.json();
    }
  };

  showLoader();
  target.innerHTML = '';

  renderHeader('header');
  renderBreadcrumb(target, path, labelOverride);

  // ====== skeleton
  target.innerHTML += `
    <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <select id="campaignFilter" class="form-select" style="min-width:260px">
          <option value="">— Pilih Campaign —</option>
        </select>
        <input class="form-control" style="min-width:260px" type="search" placeholder="Cari nama / @username / open_id / scope…" id="searchInput">
      </div>
      <div class="d-flex align-items-center gap-2 flex-wrap">
        <button class="btn btn-outline-secondary btn-refresh-all" type="button">
          <i class="bi bi-arrow-clockwise"></i> Refresh visible
        </button>
      </div>
    </div>

    <div id="kol-list"></div>

    <nav class="mt-3">
      <ul class="pagination" id="pagination"></ul>
    </nav>
  `;

  const $ = (sel) => document.querySelector(sel);
  const campaignFilter = $('#campaignFilter');
  const searchInput = $('#searchInput');
  const listWrap = $('#kol-list');
  const pager = $('#pagination');
  const refreshAllBtn = $('.btn-refresh-all');

  // Load campaigns
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

  // ===== State
  let currentPage = 1;
  let currentCampaignId = campaignFilter.value || '';
  let currentKeyword = '';
  let debounce = null;

  const fmtDateTime = (s) => s ? new Date(s).toLocaleString('id-ID') : '—';
  const fmtDate = (s) => s ? new Date(s).toLocaleDateString('id-ID') : '—';
  const safe = (x) => (x == null ? '' : String(x));

  const nameOf = (a) =>
    a.full_name ||
    (a.tiktok_username ? `@${a.tiktok_username}` : null) ||
    a.display_name ||
    a.name ||
    '—';

  const avatarOf = (a) =>
    a.avatar_url || a.tiktok_avatar_url || a.profile_pic_url || null;

    function statusOf(acc) {
        const now = Date.now();
        const expMs   = acc?.expires_at ? new Date(acc.expires_at).getTime() : null;
        const revoked = acc?.revoked_at ? new Date(acc.revoked_at).getTime() : null;
        const ts = (acc?.token_status || '').toLowerCase();

        // 1) Pakai status dari server kalau ada
        if (ts) {
        if (ts === 'revoked') return { label: 'Revoked', cls: 'badge bg-danger' };
        if (ts === 'expired') return { label: 'Expired', cls: 'badge bg-danger' };
        if (ts === 'active') {
            if (expMs && expMs - now <= 60 * 60 * 1000) { // <= 1 jam
            return { label: 'Expiring soon', cls: 'badge bg-warning text-dark' };
            }
            return { label: 'Valid', cls: 'badge bg-success' };
        }
        if (ts === 'missing') return { label: 'Not connected', cls: 'badge bg-secondary' };
        if (ts === 'unknown') return { label: 'Unknown', cls: 'badge bg-secondary' };
        }

        // 2) Fallback (kalau payload lama / tanpa token_status)
        if (revoked) return { label: 'Revoked', cls: 'badge bg-danger' };
        if (!expMs) return { label: 'Unknown', cls: 'badge bg-secondary' };
        const delta = expMs - now;
        if (delta <= 0) return { label: 'Expired', cls: 'badge bg-danger' };
        if (delta <= 60 * 60 * 1000) return { label: 'Expiring soon', cls: 'badge bg-warning text-dark' };
        return { label: 'Valid', cls: 'badge bg-success' };
    }


  function scopesShort(acc) {
    let scopes = acc?.scopes;
    if (typeof scopes === 'string') {
      scopes = scopes.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
    }
    if (!Array.isArray(scopes) || !scopes.length) return '—';
    const txt = scopes.join(', ');
    return txt.length > 60 ? txt.slice(0, 57) + '…' : txt;
  }

  function rowActions(acc) {
    const id = acc.id;
    const nm = encodeURIComponent(nameOf(acc));
    const camp = currentCampaignId ? `?campaign_id=${encodeURIComponent(currentCampaignId)}&q=${nm}` : `?q=${nm}`;
    const toSubs = `/admin/submissions${camp}`;
    return `
      <div class="d-flex gap-2 justify-content-end">
        <a class="btn btn-sm btn-outline-secondary app-link d-none" data-href="${toSubs}">
          <i class="bi bi-collection"></i> Submissions
        </a>
        <button class="btn btn-sm btn-outline-primary btn-refresh-token" data-id="${id}">
          <i class="bi bi-arrow-clockwise"></i> Refresh token
        </button>
      </div>
    `;
  }

  async function getAllowedOpenIdsByCampaign(campaignId) {
    // fallback: tarik submissions utk campaign -> ambil set open_id
    let page = 1, perPage = 100;
    const set = new Set();
    for (let i = 0; i < 2; i++) {
      const res = await submissionService.getAll({
        page, per_page: perPage, campaign_id: campaignId
      });
      const arr = res?.data || [];
      arr.forEach(s => { if (s?.tiktok_user_id) set.add(s.tiktok_user_id); });
      if (res?.current_page >= res?.last_page) break;
      page++;
    }
    return set;
  }

  async function loadKols(page = 1) {
    if (!currentCampaignId) {
      listWrap.innerHTML = `<div class="alert alert-info">Silakan pilih <b>Campaign</b> terlebih dahulu.</div>`;
      pager.innerHTML = '';
      hideLoader();
      return;
    }

    showLoader();
    try {
      // coba tarik dari influencer-accounts langsung
      let res = await influencerAccountService.getAll({
        page,
        per_page: 20,
        campaign_id: currentCampaignId,
        q: currentKeyword
      });

      let arr = res?.data || res?.items || res || [];

      // Jika server belum filter by campaign: lakukan fallback client-side
      const seemsUnfiltered = !('campaign_id' in (arr[0] || {})) && !('campaigns' in (arr[0] || {}));
      if (currentCampaignId && seemsUnfiltered) {
        const openIds = await getAllowedOpenIdsByCampaign(currentCampaignId);
        arr = arr.filter(a => openIds.has(a?.tiktok_user_id));
      }

      // Client-side keyword filter
      const kw = (currentKeyword || '').toLowerCase().trim();
      if (kw) {
        arr = arr.filter(a => {
          const hay = [
            nameOf(a),
            a?.tiktok_username ? `@${a.tiktok_username}` : '',
            a?.tiktok_user_id || '',
            Array.isArray(a?.scopes) ? a.scopes.join(',') : (a?.scopes || '')
          ].join(' ').toLowerCase();
          return hay.includes(kw);
        });
      }

      // Render table
      const rowsHtml = arr.map((a) => {
        const nm = nameOf(a);
        const av = avatarOf(a);
        const od = safe(a.tiktok_user_id);
        const scopes = scopesShort(a);
        const st = statusOf(a);
        const expires = fmtDateTime(a.expires_at);
        const lastRef = fmtDateTime(a.last_refreshed_at);

        return `
          <tr data-id="${a.id}">
            <td>
              <div class="d-flex align-items-center gap-2">
                ${av ? `<img src="${av}" alt="" style="width:34px;height:34px;border-radius:50%;object-fit:cover">` : ''}
                <div>
                  <div class="fw-semibold">${nm}</div>
                  <div class="text-muted small">${a.tiktok_username ? '@'+a.tiktok_username : ''}</div>
                </div>
              </div>
            </td>
            <td><code>${od || '—'}</code></td>
            <td><span class="${st.cls}">${st.label}</span></td>
            <td>${expires}</td>
            <td>${lastRef}</td>
            <td class="text-muted small">${scopes}</td>
            <td>${rowActions(a)}</td>
          </tr>
        `;
      }).join('');

      const tableHtml = `
        <table class="table table-bordered bg-white">
          <thead class="table-light">
            <tr><th colspan="7" class="text-uppercase">KOL Accounts</th></tr>
            <tr>
              <th style="min-width:260px">KOL</th>
              <th style="width:280px">TikTok Open ID</th>
              <th style="width:140px">Token Status</th>
              <th style="width:180px">Expires At</th>
              <th style="width:180px">Last Refreshed</th>
              <th>Scopes</th>
              <th style="width:220px">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="7" class="text-center text-muted">Tidak ada data.</td></tr>`}
          </tbody>
        </table>
      `;
      listWrap.innerHTML = tableHtml;

      // Pagination
      pager.innerHTML = '';
      const lastPage = res?.last_page || 1;
      const currPage = res?.current_page || page;
      if (lastPage > 1) {
        for (let i = 1; i <= lastPage; i++) {
          const li = document.createElement('li');
          li.className = `page-item ${i === currPage ? 'active' : ''}`;
          li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
          li.addEventListener('click', (e) => {
            e.preventDefault();
            currentPage = i;
            loadKols(currentPage);
          });
          pager.appendChild(li);
        }
      }

      attachHandlers();

    } catch (err) {
      console.error(err);
      listWrap.innerHTML = `<div class="text-danger">Gagal memuat KOL.</div>`;
    } finally {
      hideLoader();
    }
  }

  function attachHandlers() {
    // Navigate inside app
    document.querySelectorAll('.app-link').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const href = el.getAttribute('data-href');
        if (!href) return;
        history.pushState(null, '', href);
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
    });

    // Refresh token (single)
    document.querySelectorAll('.btn-refresh-token').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-id');
        if (!id) return;

        const old = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Refreshing…`;

        try {
          const resp = await influencerAccountService.refreshToken(id);
          showToast(resp?.message || 'Token berhasil di-refresh.');
          await loadKols(currentPage);
        } catch (err) {
          const msg = err?.payload?.message || err?.message || 'Gagal refresh token';
          showToast(msg, 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = old;
        }
      });
    });

    // Refresh visible (bulk)
    if (refreshAllBtn) {
      refreshAllBtn.onclick = async () => {
        const ids = Array.from(document.querySelectorAll('tbody tr[data-id]'))
          .map(tr => tr.getAttribute('data-id'))
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
            await influencerAccountService.refreshToken(id);
            ok++;
          } catch {
            fail++;
          }
        }

        await loadKols(currentPage);
        refreshAllBtn.disabled = false;
        refreshAllBtn.innerHTML = old;

        showToast(`Refresh selesai: ${ok} sukses, ${fail} gagal.`);
      };
    }
  }

  // Events
  campaignFilter.addEventListener('change', () => {
    currentCampaignId = campaignFilter.value || '';
    currentPage = 1;
    loadKols(currentPage);
  });

  searchInput.addEventListener('input', (e) => {
    currentKeyword = e.target.value;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      currentPage = 1;
      loadKols(currentPage);
    }, 250);
  });

  // Initial load
  if (campaignFilter.value) {
    currentCampaignId = campaignFilter.value;
    loadKols(currentPage);
  } else {
    hideLoader();
  }
}
