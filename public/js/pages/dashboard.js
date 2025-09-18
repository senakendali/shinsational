// /js/pages/admin/dashboard.js
export async function render(target, path, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();

  const INSTANCE_KEY = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  target.dataset.dashInstance = INSTANCE_KEY;
  target.innerHTML = "";

  const [
    headerMod,
    breadcrumbMod,
    loaderMod,
    toastMod,
    brandMod,
    campaignMod,
    submissionMod,
    registrationMod,
  ] = await Promise.all([
    import(`/js/components/header.js?v=${v}`),
    import(`/js/components/breadcrumb.js?v=${v}`),
    import(`/js/components/loader.js?v=${v}`),
    import(`/js/utils/toast.js?v=${v}`),
    import(`/js/services/brandService.js?v=${v}`),
    import(`/js/services/campaignService.js?v=${v}`),
    import(`/js/services/influencerSubmissionService.js?v=${v}`),
    import(`/js/services/influencerRegistrationService.js?v=${v}`),
  ]);

  if (target.dataset.dashInstance !== INSTANCE_KEY) return;

  const { renderHeader } = headerMod;
  const { renderBreadcrumb } = breadcrumbMod;
  const { showLoader, hideLoader } = loaderMod;
  const { showToast } = toastMod;
  const { brandService } = brandMod;
  const { campaignService } = campaignMod;
  const { submissionService } = submissionMod;
  const { influencerService } = registrationMod;

  const $  = (sel) => target.querySelector(sel);
  const $$ = (sel) => Array.from(target.querySelectorAll(sel));
  const fmt  = (n) => (n === 0 || n ? Number(n).toLocaleString('id-ID') : '0');
  const safe = (x, d=0) => (x ?? d);

  const parseMaybeJSON = (val) => {
    if (!val) return null;
    if (typeof val === 'string') { try { return JSON.parse(val); } catch { return null; } }
    if (typeof val === 'object') return val;
    return null;
  };
  const unwrapCampaign = (obj) => (obj?.data ?? obj?.campaign ?? obj ?? null);

  let lastTotals = { views: 0, likes: 0, comments: 0, shares: 0 };
  let lastKpi = null;

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

  target.innerHTML = `
    <div id="admin-dashboard-root">
      <div id="__breadcrumb_mount"></div>

      <div class="row g-3 mb-2" id="kpi-cards">
        <div class="col-md-3"><div class="dashboard-card h-100 brand"><div class="card-body d-flex align-items-center gap-3"><div class="flex-shrink-0"><i class="bi bi-building fs-1"></i></div><div class="flex-grow-1 text-end w-100"><h6 class="card-title mb-1">BRANDS</h6><div class="fs-3 fw-bold" id="kpi-brands">-</div></div></div></div></div>
        <div class="col-md-3"><div class="dashboard-card h-100 campaign"><div class="card-body d-flex align-items-center gap-3"><div class="flex-shrink-0"><i class="bi bi-megaphone fs-1"></i></div><div class="flex-grow-1 text-end w-100"><h6 class="card-title mb-1">CAMPAIGNS</h6><div class="fs-3 fw-bold" id="kpi-campaigns">-</div></div></div></div></div>
        <div class="col-md-3"><div class="dashboard-card h-100 registration"><div class="card-body d-flex align-items-center gap-3"><div class="flex-shrink-0"><i class="bi bi-people fs-1"></i></div><div class="flex-grow-1 text-end w-100"><h6 class="card-title mb-1">KOL</h6><div class="fs-3 fw-bold" id="kpi-kols">-</div></div></div></div></div>
        <div class="col-md-3"><div class="dashboard-card h-100 content"><div class="card-body d-flex align-items-center gap-3"><div class="flex-shrink-0"><i class="bi bi-file-earmark-text fs-1"></i></div><div class="flex-grow-1 text-end w-100"><h6 class="card-title mb-1">POST</h6><div class="fs-3 fw-bold" id="kpi-posts">-</div></div></div></div></div>
      </div>

      <div class="d-flex flex-column flex-lg-row gap-4 mb-5 pt-2">
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h6 class="mb-1 text-uppercase fw-bold"><i class="bi bi-pie-chart-fill"></i> Campaign Engagement</h6>
              <div class="small text-muted d-none" id="selectedBrandLine">-</div>
            </div>
            <div class="d-flex gap-2 align-items-start">
              <select id="campaignFilter" class="form-select form-select-sm" style="min-width:280px"><option value="">- Pilih Campaign -</option></select>
              <button class="btn btn-outline-secondary btn-sm" id="btnRefreshCampaign" title="Refresh grafik"><i class="bi bi-arrow-clockwise"></i></button>
            </div>
          </div>

          <div class="row g-3" id="kpi-donuts" style="display:none;">
            <div class="col-6 col-md-3"><div class="card h-100"><div class="card-body d-flex flex-column align-items-center"><div class="text-muted small mb-2">Views</div><canvas id="donut-views" height="160"></canvas><div class="small mt-2 text-center" id="cap-views">-</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card h-100"><div class="card-body d-flex flex-column align-items-center"><div class="text-muted small mb-2">Likes</div><canvas id="donut-likes" height="160"></canvas><div class="small mt-2 text-center" id="cap-likes">-</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card h-100"><div class="card-body d-flex flex-column align-items-center"><div class="text-muted small mb-2">Comments</div><canvas id="donut-comments" height="160"></canvas><div class="small mt-2 text-center" id="cap-comments">-</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card h-100"><div class="card-body d-flex flex-column align-items-center"><div class="text-muted small mb-2">Shares</div><canvas id="donut-shares" height="160"></canvas><div class="small mt-2 text-center" id="cap-shares">-</div></div></div></div>
          </div>

          <canvas id="engagementChart" class="mt-3" height="120"></canvas>

          <div class="row mt-3 gx-3 gy-2" id="eng-summary">
            <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Views</div><div class="fs-5" id="es-views">-</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Likes</div><div class="fs-5" id="es-likes">-</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Comments</div><div class="fs-5" id="es-comments">-</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Shares</div><div class="fs-5" id="es-shares">-</div></div></div></div>
          </div>

          <div class="mt-3" id="kpi-section">
            <div class="row gx-3 gy-2 d-none" id="kpi-targets">
              <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Target Views</div><div class="fs-6" id="kt-views">-</div></div></div></div>
              <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Target Likes</div><div class="fs-6" id="kt-likes">-</div></div></div></div>
              <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Target Comments</div><div class="fs-6" id="kt-comments">-</div></div></div></div>
              <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Target Shares</div><div class="fs-6" id="kt-shares">-</div></div></div></div>
            </div>
          </div>
        </div>

        <div class="w-100 w-lg-50" style="max-width:540px">
          <div id="content-summary-row" class="row g-3 mb-3 d-none">
            <div class="col-12 col-md-6">
              <div class="dashboard-card h-100">
                <div class="card-body">
                  <h6 class="card-title mb-2"><i class="bi bi-card-list"></i> CONTENT SUMMARY</h6>
                  <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <div class="small text-muted text-uppercase fs-12 fw-semibold"><i class="bi bi-bullseye"></i> Target</div>
                    <div class="fs-5 fw-bold" id="kpi-posts-target">-</div>
                  </div>
                  <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <div class="small text-muted text-uppercase fs-12 fw-semibold"><i class="bi bi-card-checklist"></i> Sudah Dibuat</div>
                    <div class="fs-6 fw-semibold" id="kpi-posts-created">-</div>
                  </div>
                  <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <div class="small text-muted text-uppercase fs-12 fw-semibold"><i class="bi bi-hourglass-split"></i> Waiting Draft</div>
                    <div class="fs-6 fw-semibold" id="kpi-posts-waiting-draft">0</div>
                  </div>
                  <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <div class="small text-muted text-uppercase fs-12 fw-semibold"><i class="bi bi-hourglass-split"></i> Waiting for Approval</div>
                    <div class="fs-6 fw-semibold" id="kpi-posts-waiting-approval">0</div>
                  </div>
                  <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <div class="small text-muted text-uppercase fs-12 fw-semibold"><i class="bi bi-pencil-square"></i> On Revision</div>
                    <div class="fs-6 fw-semibold" id="kpi-posts-revision">0</div>
                  </div>
                  <div class="d-flex justify-content-between align-items-center py-1">
                    <div class="small text-muted text-uppercase fs-12 fw-semibold"><i class="bi bi-arrow-right-square"></i> Ready to Post</div>
                    <div class="fs-6 fw-semibold" id="kpi-posts-ready">0</div>
                  </div>
                  <div class="small mt-2 text-muted" id="cap-posts-selected"></div>
                </div>
              </div>
            </div>
            <div class="col-12 col-md-6">
              <div class="dashboard-card h-100">
                <div class="card-body d-flex flex-column align-items-center">
                  <div class="small text-muted mb-2">Progress</div>
                  <canvas id="donut-content" height="120"></canvas>
                  <div class="small mt-2 text-center" id="cap-content">-</div>
                </div>
              </div>
            </div>
          </div>

          <div class="d-flex justify-content-between align-items-center mb-2 d-none" id="kol-stats-header">
            <h6 class="mb-0 text-uppercase fw-bold"><i class="bi bi-people"></i> KOL SUMMARY (Campaign Terpilih)</h6>
          </div>
          <ul class="list-group d-none" id="kol-stats-list">
            <li class="list-group-item text-muted">Pilih campaign…</li>
          </ul>

          <div class="d-flex justify-content-between align-items-center mt-3 mb-2">
            <h6 class="mb-0 text-uppercase fw-bold"><i class="bi bi-list"></i> Campaign Aktif Saat Ini</h6>
            <a class="btn btn-sm btn-outline-primary app-link" href="/admin/campaigns">Lihat semua</a>
          </div>
          <ul class="list-group" id="active-campaigns">
            <li class="list-group-item text-muted">Memuat…</li>
          </ul>

          <div class="mt-4">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="mb-0 text-uppercase fw-bold"><i class="bi bi-list"></i> Brands</h6>
              <a class="btn btn-sm btn-outline-primary app-link" href="/admin/brands">Lihat semua</a>
            </div>
            <ul class="list-group" id="brand-list">
              <li class="list-group-item text-muted">Memuat…</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;

  renderHeader("header");
  renderBreadcrumb(target, path, labelOverride);

  function destroyChartIfExists(canvasId) {
    try {
      if (!window.Chart) return;
      if (typeof Chart.getChart === 'function') {
        const canvasEl = document.getElementById(canvasId);
        const prev = Chart.getChart(canvasId) || (canvasEl ? Chart.getChart(canvasEl) : null);
        if (prev?.destroy) prev.destroy();
      } else {
        const canvasEl = document.getElementById(canvasId);
        const list = Chart.instances ? Object.values(Chart.instances) : [];
        const found = list.find(inst => inst?.canvas === canvasEl);
        if (found?.destroy) found.destroy();
      }
    } catch {}
  }

  await ensureChartJS();
  destroyChartIfExists('engagementChart');
  if (target.dataset.dashInstance !== INSTANCE_KEY) return;

  showLoader();

  try {
    const [brands, campaigns] = await Promise.all([
      brandService.getAll({ page: 1, per_page: 1 }),
      campaignService.getAll({ page: 1, per_page: 1 }),
    ]);

    if (target.dataset.dashInstance !== INSTANCE_KEY) return;

    const totalBrands = brands?.total ?? brands?.meta?.total ?? brands?.pagination?.total ?? (brands?.data?.length || 0);
    const totalCampaigns = campaigns?.total ?? campaigns?.meta?.total ?? campaigns?.pagination?.total ?? (campaigns?.data?.length || 0);

    let totalKols = 0;
    try {
      const regs = await influencerService.getAll({ page: 1, per_page: 1 });
      totalKols = regs?.total ?? regs?.meta?.total ?? regs?.pagination?.total ?? 0;
    } catch {}

    let totalPosts = 0;
    let page = 1;
    const perPage = 200;
    let lastPage = 1;

    do {
      const res = await submissionService.getAll({ page, per_page: perPage });
      if (target.dataset.dashInstance !== INSTANCE_KEY) return;
      const subs = res?.data || [];
      for (const s of subs) totalPosts += countSubmissionPosts(s);
      lastPage = res?.last_page ?? res?.meta?.last_page ?? res?.pagination?.last_page ?? 1;
      page += 1;
    } while (page <= lastPage && page <= 10);

    $('#kpi-brands').textContent = fmt(totalBrands);
    $('#kpi-campaigns').textContent = fmt(totalCampaigns);
    $('#kpi-kols').textContent = fmt(totalKols);
    $('#kpi-posts').textContent = fmt(totalPosts);
    $('#kpi-posts').title = 'Total konten dibuat (link_1..link_5) dari semua submissions';
  } catch (e) {
    console.error('Load KPIs error', e);
    showToast('Gagal memuat ringkasan KPI', 'error');
  }

  let currentCampaignId = "";
  const campaignBrandMap = new Map();
  const campaignKpiMap = new Map();
  let cachedCampaignsForBrandList = [];

  try {
    const cs = await campaignService.getAll({ page: 1, per_page: 100, status: '', include: 'brand' });
    if (target.dataset.dashInstance !== INSTANCE_KEY) return;

    const items = cs?.data || [];
    cachedCampaignsForBrandList = items.slice();

    const campaignFilter = $('#campaignFilter');
    campaignFilter.innerHTML =
      `<option value="">- Pilih Campaign -</option>` +
      items.map(c => {
        const cname = escapeHtml(c.name || `Campaign ${c.id}`);
        const bname = escapeHtml(c.brand?.name || '-');
        campaignBrandMap.set(String(c.id), bname);
        const kt = parseMaybeJSON(c.kpi_targets) || parseMaybeJSON(c.kpi) || parseMaybeJSON(c.kpiTargets) || null;
        if (kt) campaignKpiMap.set(String(c.id), kt);
        return `<option value="${c.id}">${cname} - ${bname}</option>`;
      }).join('');

    const qId = query?.campaign_id || new URL(location.href).searchParams.get('campaign_id');
    if (qId && campaignFilter.querySelector(`option[value="${qId}"]`)) {
      campaignFilter.value = qId;
      currentCampaignId = qId;
    }

    updateSelectedBrandLine(currentCampaignId);
    renderBrandListFromCampaigns(cachedCampaignsForBrandList);
  } catch (e) {
    console.error('Load campaigns error', e);
    $('#brand-list').innerHTML = `<li class="list-group-item text-danger">Gagal memuat brands</li>`;
  }

  try {
    const active = await campaignService.getAll({ page: 1, per_page: 8, status: 'active', include: 'brand' });
    if (target.dataset.dashInstance !== INSTANCE_KEY) return;

    const arr = active?.data || [];
    const ul = $('#active-campaigns');
    if (!arr.length) {
      ul.innerHTML = `<li class="list-group-item text-muted">Tidak ada campaign aktif.</li>`;
    } else {
      ul.innerHTML = arr.map(c => {
        const period = [
          c.start_date ? new Date(c.start_date).toLocaleDateString('id-ID') : null,
          c.end_date ? new Date(c.end_date).toLocaleDateString('id-ID') : null
        ].filter(Boolean).join(' – ') || '-';
        const badge =
          c.status === 'active' ? 'success' :
          c.status === 'paused' ? 'warning' :
          c.status === 'completed' ? 'primary' :
          c.status === 'archived' ? 'secondary' :
          c.status === 'scheduled' ? 'info' : 'light';
        return `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <div class="fw-semibold">${escapeHtml(c.name || '')}</div>
              <div class="small text-muted">${escapeHtml(c.brand?.name || '-')}</div>
              <div class="small text-muted">${period}</div>
            </div>
            <span class="badge bg-${badge}">${escapeHtml(c.status || '-')}</span>
          </li>`;
      }).join('');
    }
  } catch (e) {
    console.error('Load active campaigns error', e);
    $('#active-campaigns').innerHTML = `<li class="list-group-item text-danger">Gagal memuat campaign aktif</li>`;
  }

  const chartCanvas = $('#engagementChart');
  const chartCtx = chartCanvas.getContext('2d');

  window.__ADMIN_DASHBOARD_CHART__ ??= null;
  const donutIds = ['views','likes','comments','shares'];
  const donutCharts = Object.fromEntries(donutIds.map(id => [id, null]));
  let contentDonut = null;

  const fmtShort = (n) => {
    const x = Number(n) || 0;
    if (x >= 1e9) return (x/1e9).toFixed(1) + 'B';
    if (x >= 1e6) return (x/1e6).toFixed(1) + 'M';
    if (x >= 1e3) return (x/1e3).toFixed(1) + 'K';
    return x.toLocaleString('id-ID');
  };

  const renderChart = (views, likes, comments, shares) => {
    if (window.__ADMIN_DASHBOARD_CHART__?.destroy) {
      try { window.__ADMIN_DASHBOARD_CHART__.destroy(); } catch {}
      window.__ADMIN_DASHBOARD_CHART__ = null;
    }
    destroyChartIfExists(chartCanvas.id);

    window.__ADMIN_DASHBOARD_CHART__ = new window.Chart(chartCtx, {
      type: 'bar',
      data: {
        labels: ['Views', 'Likes', 'Comments', 'Shares'],
        datasets: [{
          label: 'Total',
          data: [views, likes, comments, shares],
          backgroundColor: [
            'rgba(194, 239, 12, 0.6)',
            'rgba(13, 110, 253, 0.6)',
            'rgba(131, 53, 220, 0.6)',
            'rgba(255, 159, 64, 0.6)',
          ],
          borderWidth: 1,
          barThickness: 80,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { callback: (v)=>fmtShort(v) } } }
      }
    });
  };

  function applyKpiTargets(kpi) {
    const row = $('#kpi-targets');
    if (!row) return;
    const hasAny = kpi && (safe(kpi.views) || safe(kpi.likes) || safe(kpi.comments) || safe(kpi.shares));
    if (!hasAny) {
      row.classList.add('d-none');
      ['kt-views','kt-likes','kt-comments','kt-shares'].forEach(id => { const el = $('#'+id); if (el) el.textContent = '-'; });
      $('#kpi-donuts').style.display = 'none';
      destroyDonuts();
      return;
    }
    $('#kt-views').textContent    = kpi.views    != null ? fmt(Number(kpi.views))    : '-';
    $('#kt-likes').textContent    = kpi.likes    != null ? fmt(Number(kpi.likes))    : '-';
    $('#kt-comments').textContent = kpi.comments != null ? fmt(Number(kpi.comments)) : '-';
    $('#kt-shares').textContent   = kpi.shares   != null ? fmt(Number(kpi.shares))   : '-';
    row.classList.remove('d-none');
  }

  async function ensureCampaignKpi(campaignId) {
    if (!campaignId) return null;
    const key = String(campaignId);
    if (campaignKpiMap.has(key)) return campaignKpiMap.get(key);
    try {
      const detail = await campaignService.get(campaignId);
      const c = unwrapCampaign(detail);
      const raw = c?.kpi_targets ?? c?.kpi ?? c?.kpiTargets ?? null;
      const kpi = parseMaybeJSON(raw) || (typeof raw === 'object' ? raw : null);
      if (kpi) campaignKpiMap.set(key, kpi);
      return kpi;
    } catch { return null; }
  }

  function destroyDonuts() {
    for (const k of donutIds) {
      try { donutCharts[k]?.destroy?.(); donutCharts[k] = null; } catch {}
      destroyChartIfExists(`donut-${k}`);
    }
    try { contentDonut?.destroy?.(); } catch {}
    contentDonut = null;
    destroyChartIfExists('donut-content');
  }

  function renderOneDonut(kind, actual, target) {
    const canvas = $(`#donut-${kind}`);
    const cap = $(`#cap-${kind}`);
    if (!canvas || !cap) return;

    if (!(Number(target) > 0) && !(Number(actual) > 0)) {
      cap.textContent = '-';
      try { donutCharts[kind]?.destroy?.(); } catch {}
      donutCharts[kind] = null;
      return;
    }

    const T = Math.max(0, Number(target)||0);
    const A = Math.max(0, Number(actual)||0);
    const remain = Math.max(0, T - A);

    const pct = T > 0 ? Math.min(100, Math.round((A/T)*100)) : 100;
    const capText = T > 0 ? `${fmtShort(A)} / ${fmtShort(T)} (${pct}%)` : `${fmtShort(A)} (no KPI)`;
    cap.textContent = capText;

    try { donutCharts[kind]?.destroy?.(); } catch {}
    destroyChartIfExists(`donut-${kind}`);

    donutCharts[kind] = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Actual','Remaining'],
        datasets: [{ data: T > 0 ? [Math.min(A, T), remain] : [A, 0], backgroundColor: ['rgba(13,110,253,0.8)', 'rgba(200,200,200,0.45)'], borderWidth: 0 }]
      },
      options: { responsive: true, cutout: '65%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${fmtShort(ctx.parsed)}` } } } }
    });
  }

  function renderContentDonut(actual, target) {
    const canvas = $('#donut-content');
    const cap = $('#cap-content');
    if (!canvas || !cap) return;

    if (!(Number(target) > 0) && !(Number(actual) > 0)) {
      cap.textContent = '-';
      try { contentDonut?.destroy?.(); } catch {}
      contentDonut = null;
      return;
    }

    const T = Math.max(0, Number(target)||0);
    const A = Math.max(0, Number(actual)||0);
    const remain = Math.max(0, T - A);

    const pct = T > 0 ? Math.min(100, Math.round((A/T)*100)) : 100;
    cap.textContent = T > 0 ? `${fmtShort(A)} / ${fmtShort(T)} (${pct}%)` : `${fmtShort(A)} (no target)`;

    try { contentDonut?.destroy?.(); } catch {}
    destroyChartIfExists('donut-content');

    contentDonut = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: { labels: ['Dibuat','Sisa'], datasets: [{ data: T > 0 ? [Math.min(A, T), remain] : [A, 0], backgroundColor: ['rgba(25,135,84,0.85)', 'rgba(200,200,200,0.45)'], borderWidth: 0 }] },
      options: { responsive: true, cutout: '65%', plugins: { legend: { display: false } } }
    });
  }

  function renderKpiDonuts(totals, kpi) {
    const wrap = $('#kpi-donuts');
    if (!wrap) return;
    const hasAnyKpi = kpi && [kpi.views,kpi.likes,kpi.comments,kpi.shares].some(v => Number(v) > 0);
    wrap.style.display = hasAnyKpi ? '' : 'none';
    if (!hasAnyKpi) { destroyDonuts(); return; }
    renderOneDonut('views',    totals.views,    kpi.views);
    renderOneDonut('likes',    totals.likes,    kpi.likes);
    renderOneDonut('comments', totals.comments, kpi.comments);
    renderOneDonut('shares',   totals.shares,   kpi.shares);
  }

  async function getCampaignContentTarget(campaignId) {
    if (!campaignId) return null;
    const kpi = await ensureCampaignKpi(campaignId);
    const raw = (kpi?.contents ?? kpi?.content);
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  async function getCampaignContentPerKol(campaignId) {
    if (!campaignId) return 1;
    try {
      const detail = await campaignService.get(campaignId);
      const c = unwrapCampaign(detail);
      if (!c) return 1;
      const direct = Number(c.contents_per_kol ?? c.content_per_kol ?? c.posts_per_kol ?? c.post_per_kol);
      if (Number.isFinite(direct) && direct > 0) return direct;
      const kpiRaw = c.kpi_targets ?? c.kpi ?? c.kpiTargets ?? null;
      const kpi = parseMaybeJSON(kpiRaw) || (typeof kpiRaw === 'object' ? kpiRaw : null);
      const fromKpi = Number(kpi?.contents_per_kol ?? kpi?.content_per_kol ?? kpi?.posts_per_kol ?? kpi?.post_per_kol);
      if (Number.isFinite(fromKpi) && fromKpi > 0) return fromKpi;
      return 1;
    } catch { return 1; }
  }

  function getField(obj, names) {
    if (!obj) return undefined;
    for (const n of names) { if (n in obj) return obj[n]; }
    return undefined;
  }
  function isFilled(v) {
    if (v == null) return false;
    const s = String(v).trim();
    if (!s) return false;
    if (s.toUpperCase() === 'NULL') return false;
    return true;
  }
  function countSubmissionPosts(sub) {
    if (!sub || typeof sub !== 'object') return 0;
    let count = 0;
    for (let i = 1; i <= 5; i++) if (isFilled(sub[`link_${i}`])) count += 1;
    return count;
  }

  // ===== DRAFTS HELPERS (pakai controller draft terpisah) =====
  async function fetchDraftPage({ campaign_id, status = '', slot = '', page = 1, per_page = 50 }) {
    const qs = new URLSearchParams({
      campaign_id: String(campaign_id),
      per_page: String(per_page),
      page: String(page),
    });
    if (status) qs.set('status', status);
    if (slot) qs.set('slot', String(slot));
    const url = `/api/influencer-submissions/draft/with-influencer?${qs.toString()}`;
    const r = await fetchWithCsrf(url);
    if (!r.ok) throw new Error('Gagal memuat draft');
    return r.json();
  }

  // countDrafts: bisa filter status & slot
  async function countDrafts(campaignId, { status = '', slot = '' } = {}) {
    let total = 0;
    let page = 1;
    const perPage = 50;
    let lastPage = 1;
    do {
      const res = await fetchDraftPage({ campaign_id: campaignId, status, slot, page, per_page: perPage });
      const pTotal = res?.total ?? res?.meta?.total ?? res?.pagination?.total;
      if (typeof pTotal === 'number') {
        total = pTotal;
        lastPage = res?.last_page ?? res?.meta?.last_page ?? res?.pagination?.last_page ?? 1;
        break;
      } else {
        const data = res?.data || res;
        const arr = Array.isArray(data) ? data : (data?.data || []);
        total += (Array.isArray(arr) ? arr.length : 0);
        lastPage = res?.last_page ?? res?.meta?.last_page ?? res?.pagination?.last_page ?? 1;
      }
      page += 1;
    } while (page <= lastPage);
    return total;
  }

  async function fetchApprovedDraftsForReadyToPost(campaignId) {
    let rows = [];
    let page = 1; const perPage = 50; let lastPage = 1;
    do {
      const res = await fetchDraftPage({ campaign_id: campaignId, status: 'approved', page, per_page: perPage });
      const data = res?.data || res;
      const arr = Array.isArray(data) ? data : (data?.data || []);
      rows = rows.concat(arr);
      lastPage = res?.last_page ?? res?.meta?.last_page ?? res?.pagination?.last_page ?? 1;
      page += 1;
    } while (page <= lastPage);
    return rows;
  }

  function renderKolStats(buyCount, rateCount, shipCount, kolTotal) {
    const header = $('#kol-stats-header');
    const list = $('#kol-stats-list');
    if (!header || !list) return;
    header.classList.remove('d-none');
    list.classList.remove('d-none');
    list.innerHTML = `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <div class="fw-semibold">Jumlah KOL Join</div>
          <div class="small text-muted">total pendaftar/terdaftar</div>
        </div>
        <span class="badge bg-dark">${fmt(kolTotal)}</span>
      </li>
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div><div class="fw-semibold">KOL Sudah Beli</div><div class="small text-muted">invoice terunggah</div></div>
        <span class="badge bg-primary">${fmt(buyCount)}</span>
      </li>
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div><div class="fw-semibold">KOL Sudah Rating</div><div class="small text-muted">bukti rating terunggah</div></div>
        <span class="badge bg-success">${fmt(rateCount)}</span>
      </li>
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div><div class="fw-semibold">KOL Dapat Resi</div><div class="small text-muted">courier & tracking ada</div></div>
        <span class="badge bg-warning text-dark">${fmt(shipCount)}</span>
      </li>
    `;
  }

  function hideKolStats() {
    $('#kol-stats-header')?.classList.add('d-none');
    const list = $('#kol-stats-list');
    if (list) { list.classList.add('d-none'); list.innerHTML = `<li class="list-group-item text-muted">Pilih campaign…</li>`; }
  }

  async function loadCampaignEngagement(campaignId) {
    if (target.dataset.dashInstance !== INSTANCE_KEY) return;

    ensureCampaignKpi(campaignId).then((kpi) => {
      if (target.dataset.dashInstance !== INSTANCE_KEY) return;
      lastKpi = kpi || null;
      applyKpiTargets(lastKpi);
      const totalsSafe = lastTotals || { views: 0, likes: 0, comments: 0, shares: 0 };
      renderKpiDonuts(totalsSafe, lastKpi || {});
    });

    const rowWrap  = $('#content-summary-row');
    const elTarget = $('#kpi-posts-target');
    const elMade   = $('#kpi-posts-created');
    const elWaitDraft    = $('#kpi-posts-waiting-draft');
    const elWaitApproval = $('#kpi-posts-waiting-approval');
    const elRevision     = $('#kpi-posts-revision');
    const elReady        = $('#kpi-posts-ready');

    if (!campaignId) {
      lastTotals = { views:0, likes:0, comments:0, shares:0 };
      renderKpiDonuts(lastTotals, lastKpi || {});
      renderChart(0,0,0,0);
      $('#es-views').textContent = '-';
      $('#es-likes').textContent = '-';
      $('#es-comments').textContent = '-';
      $('#es-shares').textContent = '-';
      if (rowWrap) rowWrap.classList.add('d-none');
      destroyChartIfExists('donut-content'); try { contentDonut?.destroy?.(); } catch {}
      contentDonut = null; $('#cap-content') && ($('#cap-content').textContent = '-');
      hideKolStats();
      return;
    } else {
      if (rowWrap) rowWrap.classList.remove('d-none');
      if (elTarget) elTarget.textContent = '…';
      if (elMade)   elMade.textContent   = '…';
      if (elWaitDraft)    elWaitDraft.textContent = '0';
      if (elWaitApproval) elWaitApproval.textContent = '0';
      if (elRevision)     elRevision.textContent = '0';
      if (elReady)        elReady.textContent = '0';
      $('#cap-content') && ($('#cap-content').textContent = 'Memuat…');
      const hdr = $('#kol-stats-header'); const lst = $('#kol-stats-list');
      hdr?.classList.remove('d-none'); lst?.classList.remove('d-none');
      if (lst) lst.innerHTML = `<li class="list-group-item text-muted">Menghitung…</li>`;
    }

    const targetPromise = getCampaignContentTarget(campaignId).catch(() => null);

    let page = 1;
    const perPage = 100;
    let lastPage = 1;

    const agg = { views: 0, likes: 0, comments: 0, shares: 0 };
    let totalPostedContents = 0;

    const subLinksMap = new Map();
    const buyerSet  = new Set();
    const ratingSet = new Set();
    const shipSet   = new Set();

    const kolKeyOf = (s) => String(s.tiktok_user_id ?? s.influencer_id ?? s.creator_id ?? s.user_id ?? s.id);

    do {
      const res = await submissionService.getAll({ page, per_page: perPage, include: '', campaign_id: campaignId });
      if (target.dataset.dashInstance !== INSTANCE_KEY) return;

      const subs = res?.data || [];
      subs.forEach(s => {
        agg.views    += safe(Number(s.views_1))    + safe(Number(s.views_2));
        agg.likes    += safe(Number(s.likes_1))    + safe(Number(s.likes_2));
        agg.comments += safe(Number(s.comments_1)) + safe(Number(s.comments_2));
        agg.shares   += safe(Number(s.shares_1))   + safe(Number(s.shares_2));

        totalPostedContents += countSubmissionPosts(s);

        const id = s.id;
        const pres = {}; for (let i = 1; i <= 5; i++) pres[i] = isFilled(s[`link_${i}`]);
        subLinksMap.set(id, pres);

        const key = kolKeyOf(s);
        const invoice = getField(s, ['invoice_file_path']);
        if (isFilled(invoice)) buyerSet.add(key);
        const reviewProof = getField(s, ['review_proof_file_patch','review_proof_file_path']);
        if (isFilled(reviewProof)) ratingSet.add(key);
        const courier = getField(s, ['shipping_courir','shipping_courier']);
        const tracking = getField(s, ['shipping_tracking_number']);
        if (isFilled(courier) && isFilled(tracking)) shipSet.add(key);
      });

      lastPage = res?.last_page ?? res?.meta?.last_page ?? res?.pagination?.last_page ?? 1;
      page += 1;
    } while (page <= lastPage && page <= 5);

    lastTotals = agg;
    renderKpiDonuts(lastTotals, lastKpi || {});
    renderChart(agg.views, agg.likes, agg.comments, agg.shares);
    $('#es-views').textContent = fmt(agg.views);
    $('#es-likes').textContent = fmt(agg.likes);
    $('#es-comments').textContent = fmt(agg.comments);
    $('#es-shares').textContent = fmt(agg.shares);

    const targetVal = await targetPromise;
    if (elTarget) elTarget.textContent = targetVal != null ? fmt(targetVal) : '-';
    if (elMade)   elMade.textContent   = fmt(totalPostedContents);
    renderContentDonut(totalPostedContents, targetVal ?? 0);

    // ===== Waiting Draft = (#KOL * perKol) - (jumlah draft yang sudah dibuat untuk slot 1..perKol)
    let kolCount = 0;
    try {
      const regs = await influencerService.getAll({ page: 1, per_page: 1, campaign_id: campaignId });
      kolCount = regs?.total ?? regs?.meta?.total ?? regs?.pagination?.total ?? 0;
    } catch { kolCount = 0; }
    const perKol = await getCampaignContentPerKol(campaignId);

    let totalDraftsCreated = 0;
    for (let slot = 1; slot <= perKol; slot++) {
      totalDraftsCreated += await countDrafts(campaignId, { slot }); // semua status
    }
    const waitingDraftTotal = Math.max(0, (Number(kolCount) * Number(perKol)) - Number(totalDraftsCreated));
    if (elWaitDraft) elWaitDraft.textContent = fmt(waitingDraftTotal);

    // ===== Waiting for Approval = pending
    const draftPendingCount = await countDrafts(campaignId, { status: 'pending' });
    if (elWaitApproval) elWaitApproval.textContent = fmt(draftPendingCount);

    // ===== On Revision = rejected
    const draftRejectedCount = await countDrafts(campaignId, { status: 'rejected' });
    if (elRevision) elRevision.textContent = fmt(draftRejectedCount);

    // ===== Ready to Post = approved tapi slot BELUM dipost
    const approvedDrafts = await fetchApprovedDraftsForReadyToPost(campaignId);
    let readyToPost = 0;
    for (const row of approvedDrafts) {
      const subId = row?.submission?.id ?? row?.submission_id;
      const slot = Number(row?.slot || 0);
      if (!subId || !(slot >= 1 && slot <= 5)) continue;
      const pres = subLinksMap.get(subId);
      const posted = pres ? !!pres[slot] : false;
      if (!posted) readyToPost += 1;
    }
    if (elReady) elReady.textContent = fmt(readyToPost);

    renderKolStats(buyerSet.size, ratingSet.size, shipSet.size, kolCount);

  }

  await loadCampaignEngagement(currentCampaignId);

  $('#campaignFilter').addEventListener('change', async (e) => {
    currentCampaignId = e.target.value || '';
    updateSelectedBrandLine(currentCampaignId);
    showLoader();
    try { await loadCampaignEngagement(currentCampaignId); } finally { hideLoader(); }
  });

  $('#btnRefreshCampaign').addEventListener('click', async () => {
    if (!currentCampaignId) { showToast('Pilih campaign dulu ya.', 'error'); return; }
    showLoader();
    try { await loadCampaignEngagement(currentCampaignId); showToast('Engagement diperbarui.'); }
    catch { showToast('Gagal memuat engagement.', 'error'); }
    finally { hideLoader(); }
  });

  $$('.app-link').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const href = el.getAttribute('href');
      if (!href) return;
      history.pushState(null, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  });

  hideLoader();

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  function updateSelectedBrandLine(campaignId) {
    const el = $('#selectedBrandLine');
    if (!el) return;
    if (!campaignId) { el.textContent = '-'; return; }
    const brandName = campaignBrandMap.get(String(campaignId)) || '-';
    el.textContent = brandName;
  }
  function renderBrandListFromCampaigns(campaigns) {
    if (target.dataset.dashInstance !== INSTANCE_KEY) return;
    const ul = $('#brand-list');
    if (!ul) return;
    if (!Array.isArray(campaigns) || !campaigns.length) {
      ul.innerHTML = `<li class="list-group-item text-muted">Tidak ada data brand.</li>`;
      return;
    }
    const agg = new Map();
    for (const c of campaigns) {
      const bid = c.brand?.id ?? `name:${c.brand?.name || '-'}`;
      const bname = c.brand?.name || '-';
      if (!agg.has(bid)) agg.set(bid, { name: bname, total: 0, active: 0 });
      const rec = agg.get(bid);
      rec.total += 1;
      if (String(c.status) === 'active') rec.active += 1;
    }
    const list = Array.from(agg.values()).sort((a,b) => b.total - a.total).slice(0, 10);
    ul.innerHTML = list.map(b => `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div class="d-flex flex-column">
          <div class="fw-semibold">${escapeHtml(b.name)}</div>
          <div class="small text-muted">${b.active} aktif • ${b.total} campaign</div>
        </div>
        <div>
          <span class="badge bg-primary me-1" title="Total campaign">${b.total}</span>
          <span class="badge bg-success" title="Active">${b.active}</span>
        </div>
      </li>
    `).join('');
  }
}

async function ensureChartJS() {
  if (window.Chart) return;
  await new Promise((resolve, reject) => {
    const id = 'chartjs-cdn';
    if (document.getElementById(id)) {
      document.getElementById(id).addEventListener('load', resolve);
      return;
    }
    const s = document.createElement('script');
    s.id = id; s.src = 'https://cdn.jsdelivr.net/npm/chart.js'; s.async = true;
    s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
  });
}

export function cleanupAdminDashboard() {
  try { if (window.__ADMIN_DASHBOARD_CHART__?.destroy) window.__ADMIN_DASHBOARD_CHART__.destroy(); } catch {}
  window.__ADMIN_DASHBOARD_CHART__ = null;
  if (window.Chart && typeof Chart.getChart === 'function') {
    const canvasEl = document.getElementById('engagementChart');
    const prev = Chart.getChart('engagementChart') || (canvasEl ? Chart.getChart(canvasEl) : null);
    if (prev?.destroy) prev.destroy();
  }
  ['donut-views','donut-likes','donut-comments','donut-shares','donut-content'].forEach(id => {
    try { Chart.getChart?.(id)?.destroy?.(); } catch {}
  });
}
