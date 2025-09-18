// /js/pages/shipment/index.js
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
  const safe = (v, d='') => (v == null ? d : v);

  const kolNameOf = (s = {}) =>
    s.full_name ||
    (s.tiktok_username ? `@${s.tiktok_username}` : null) ||
    s.display_name ||
    s.tiktok_display_name ||
    s.name ||
    s.creator_name ||
    s.influencer_name ||
    s.user_name ||
    '—';

  const tiktokUsernameOf = (s = {}) => s.tiktok_username ? `@${s.tiktok_username}` : '—';

  const phoneOf = (s = {}) => {
    const k = ['contact_phone','phone','phone_number','whatsapp','wa','mobile','telp','no_hp'];
    for (const key of k) if (s[key]) return s[key];
    return '';
  };

  const emailOf = (s = {}) => {
    const k = ['contact_email','email','kol_email'];
    for (const key of k) if (s[key]) return s[key];
    return '';
  };

  const addressOf = (s = {}) => {
    const pick = (...keys) => keys.map(k => s?.[k]).find(v => v && String(v).trim() !== '');
    const full =
      pick('full_address','address','alamat','shipping_address') ||
      [pick('address_line_1','alamat_1'), pick('address_line_2','alamat_2'), pick('city','kota'), pick('state','province','provinsi'), pick('postal_code','zip')]
        .filter(Boolean)
        .join(', ');
    return (full && String(full).trim()) || '';
  };

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
  renderBreadcrumb(target, path, labelOverride ?? 'Manage Shipments');

  target.innerHTML += `
    <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <select id="campaignFilter" class="form-select" style="min-width:280px">
          <option value="">— Select Campaign —</option>
        </select>
        <input class="form-control" style="min-width:280px" type="search" placeholder="Search name/phone/email/address…" id="searchInput">
      </div>
      <div class="d-flex align-items-center gap-2 flex-wrap">
        <button class="btn btn-outline-secondary btn-refresh" type="button">
          <i class="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>
    </div>

    <div id="shipments-list"></div>

    <nav class="mt-3">
      <ul class="pagination" id="pagination"></ul>
    </nav>
  `;

  const campaignFilter = $('#campaignFilter');
  const searchInput = $('#searchInput');
  const listWrap = $('#shipments-list');
  const pager = $('#pagination');
  const refreshBtn = $('.btn-refresh');

  // ---------- populate campaign filter ----------
  try {
    const data = await campaignService.getAll({ page: 1, per_page: 100, status: '' });
    const items = data?.data || [];
    campaignFilter.innerHTML =
      `<option value="">— Select Campaign —</option>` +
      items.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const preset = query?.campaign_id || new URL(location.href).searchParams.get('campaign_id');
    if (preset && campaignFilter.querySelector(`option[value="${preset}"]`)) {
      campaignFilter.value = preset;
    }
  } catch {}

  // ---------- state ----------
  let currentPage = 1;
  let currentCampaignId = campaignFilter.value || '';
  let currentKeyword = '';
  let debounce = null;

  // ---------- API (use dedicated shipments endpoints) ----------
  async function fetchShipments({ page = 1, per_page = 20, campaign_id, q = '' }) {
    const qs = new URLSearchParams({
      page: String(page),
      per_page: String(per_page),
      campaign_id: String(campaign_id || ''),
    });
    if (q) qs.set('q', q);
    const url = `/api/influencer-submissions/shipments?${qs.toString()}`;
    const r = await fetchWithCsrf(url, { method: 'GET' });
    if (!r.ok) {
      let msg = 'Failed to load shipments.';
      try { const j = await r.json(); msg = j?.message || msg; } catch {}
      throw new Error(msg);
    }
    return r.json();
  }

  async function saveShipment(submissionId, { courier, tracking }) {
    const r = await fetchWithCsrf(`/api/influencer-submissions/${encodeURIComponent(submissionId)}/shipment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shipping_courier: courier,
        shipping_tracking_number: tracking,
      }),
    });
    if (!r.ok) {
      let msg = 'Failed to save shipment.';
      try { const j = await r.json(); msg = j?.message || msg; } catch {}
      throw new Error(msg);
    }
    return r.json();
  }

  // ---------- loader ----------
  async function loadShipments(page = 1) {
    currentCampaignId = campaignFilter.value || '';
    if (!currentCampaignId) {
      listWrap.innerHTML = `<div class="alert alert-info">Please select a <b>Campaign</b> first.</div>`;
      pager.innerHTML = '';
      hideLoader();
      return;
    }

    showLoader();
    try {
      const res = await fetchShipments({
        page,
        per_page: 20,
        campaign_id: currentCampaignId,
        q: currentKeyword.trim(),
      });

      const rows = Array.isArray(res?.data) ? res.data : (res?.data?.data || []); // support either paginator shape

      const body = rows.map(s => {
        const id = s.id;
        const name = kolNameOf(s);
        const uname = tiktokUsernameOf(s);
        const phone = safe(phoneOf(s), '—');
        const email = safe(emailOf(s), '—');
        const addr = safe(addressOf(s), '—');

        const courier = s.shipping_courier || '';
        const tracking = s.shipping_tracking_number || '';

        // Enter in tracking triggers save
        return `
          <tr data-id="${id}">
            <td style="min-width:240px">
              <div class="fw-semibold">${name}</div>
              <div class="small text-muted">${uname}</div>
            </td>
            <td style="min-width:140px">${phone || '—'}</td>
            <td style="min-width:220px">${email || '—'}</td>
            <td style="min-width:320px">${addr || '—'}</td>
            <td style="width:200px">
              <input type="text" class="form-control form-control-sm js-courier" placeholder="Courier"
                     value="${courier?.replace(/"/g,'&quot;') || ''}">
            </td>
            <td style="width:220px">
              <input type="text" class="form-control form-control-sm js-tracking" placeholder="AWB / Tracking No."
                     value="${tracking?.replace(/"/g,'&quot;') || ''}">
            </td>
            <td style="width:140px" class="text-end">
              <button class="btn btn-sm btn-outline-primary js-save">
                <i class="bi bi-save"></i> Save
              </button>
            </td>
          </tr>
        `;
      }).join('');

      const table = `
        <div class="table-responsive">
          <table class="table table-bordered bg-white align-middle">
            <thead class="table-light">
              <tr>
                <th style="min-width:240px">KOL</th>
                <th style="min-width:140px">Phone</th>
                <th style="min-width:220px">Email</th>
                <th style="min-width:320px">Address</th>
                <th style="width:200px">Courier</th>
                <th style="width:220px">AWB / Tracking No.</th>
                <th style="width:140px"></th>
              </tr>
            </thead>
            <tbody>
              ${body || `<tr><td colspan="7" class="text-center text-muted">No data.</td></tr>`}
            </tbody>
          </table>
        </div>
      `;
      listWrap.innerHTML = table;

      // Pagination (Laravel paginator)
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
            loadShipments(currentPage);
          });
          pager.appendChild(li);
        }
      }

      attachRowHandlers();

    } catch (err) {
      console.error(err);
      listWrap.innerHTML = `<div class="text-danger">Failed to load shipments.</div>`;
      pager.innerHTML = '';
    } finally {
      hideLoader();
    }
  }

  // ---------- row handlers ----------
  function attachRowHandlers() {
    listWrap.querySelectorAll('tr[data-id]').forEach(tr => {
      const id = tr.getAttribute('data-id');
      const courierEl = tr.querySelector('.js-courier');
      const trackingEl = tr.querySelector('.js-tracking');
      const saveBtn = tr.querySelector('.js-save');

      // Pressing Enter in the tracking input triggers Save
      trackingEl?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveBtn?.click();
        }
      });

      saveBtn?.addEventListener('click', async () => {
        const courier = (courierEl?.value || '').trim();
        const tracking = (trackingEl?.value || '').trim();
        if (!courier || !tracking) {
          showToast('Courier and tracking number are required.', 'error');
          return;
        }

        const old = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Saving…`;
        try {
          await saveShipment(id, { courier, tracking });
          showToast('Shipment saved.');
          await loadShipments(currentPage);
        } catch (e) {
          showToast(e?.message || 'Failed to save shipment.', 'error');
        } finally {
          saveBtn.disabled = false;
          saveBtn.innerHTML = old;
        }
      });
    });
  }

  // ---------- top controls ----------
  campaignFilter.addEventListener('change', () => {
    currentCampaignId = campaignFilter.value || '';
    currentPage = 1;
    loadShipments(currentPage);
  });

  searchInput.addEventListener('input', (e) => {
    currentKeyword = e.target.value;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      currentPage = 1;
      loadShipments(currentPage);
    }, 250);
  });

  refreshBtn?.addEventListener('click', () => loadShipments(currentPage));

  // ---------- init ----------
  if (campaignFilter.value) {
    currentCampaignId = campaignFilter.value;
    loadShipments(currentPage);
  } else {
    hideLoader();
  }
}
