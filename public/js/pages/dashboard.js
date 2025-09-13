// /js/pages/admin/dashboard.js
export async function render(target, path, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();

  // --- instance guard: cegah duplikasi saat render dipanggil 2x berbarengan
  const INSTANCE_KEY = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  target.dataset.dashInstance = INSTANCE_KEY;

  // reset container
  target.innerHTML = "";

  const [
    headerMod,
    breadcrumbMod,
    loaderMod,
    toastMod,
    brandMod,
    campaignMod,
    submissionMod,
  ] = await Promise.all([
    import(`/js/components/header.js?v=${v}`),
    import(`/js/components/breadcrumb.js?v=${v}`),
    import(`/js/components/loader.js?v=${v}`),
    import(`/js/utils/toast.js?v=${v}`),
    import(`/js/services/brandService.js?v=${v}`),
    import(`/js/services/campaignService.js?v=${v}`),
    import(`/js/services/influencerSubmissionService.js?v=${v}`),
  ]);

  if (target.dataset.dashInstance !== INSTANCE_KEY) return;

  const { renderHeader } = headerMod;
  const { renderBreadcrumb } = breadcrumbMod;
  const { showLoader, hideLoader } = loaderMod;
  const { showToast } = toastMod;
  const { brandService } = brandMod;
  const { campaignService } = campaignMod;
  const { submissionService } = submissionMod;

  // Helpers (scoped ke target)
  const $ = (sel) => target.querySelector(sel);
  const $$ = (sel) => Array.from(target.querySelectorAll(sel));
  const fmt = (n) => (n === 0 || n ? Number(n).toLocaleString('id-ID') : '0');
  const safe = (x) => (x ?? 0);

  // inject layout
  target.innerHTML = `
    <div id="admin-dashboard-root">
      <div id="__breadcrumb_mount"></div>

      <!-- KPI cards -->
      <div class="row g-3 mb-4" id="kpi-cards">
        <div class="col-md-3">
          <div class="dashboard-card text-center h-100 brand">
            <div class="dashboard-card-body">
              <h5 class="card-title">BRANDS</h5>
              <p class="card-text fs-3 fw-bold" id="kpi-brands">—</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="dashboard-card text-center h-100 campaign">
            <div class="card-body">
              <h5 class="card-title">CAMPAIGNS</h5>
              <p class="card-text fs-3 fw-bold" id="kpi-campaigns">—</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="dashboard-card  text-center h-100 registration">
            <div class="card-body">
              <h5 class="card-title">KOL</h5>
              <p class="card-text fs-3 fw-bold" id="kpi-kols">—</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="dashboard-card text-center h-100 content">
            <div class="card-body">
              <h5 class="card-title">POST</h5>
              <p class="card-text fs-3 fw-bold" id="kpi-posts">—</p>
            </div>
          </div>
        </div>
      </div>

      <!-- chart + active campaigns -->
      <div class="d-flex flex-column flex-lg-row gap-4 mb-5 pt-2">
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h5 class="mb-1">Campaign Engagement</h5>
              <div class="small text-muted" id="selectedBrandLine">—</div>
            </div>
            <div class="d-flex gap-2 align-items-start">
              <select id="campaignFilter" class="form-select form-select-sm" style="min-width:280px">
                <option value="">— Pilih Campaign —</option>
              </select>
              <button class="btn btn-outline-secondary btn-sm" id="btnRefreshCampaign" title="Refresh grafik">
                <i class="bi bi-arrow-clockwise"></i>
              </button>
            </div>
          </div>

          <!-- Donut charts: Actual vs KPI per metric -->
          <div class="row g-3" id="kpi-donuts" style="display:none;">
            <div class="col-6 col-md-3">
              <div class="card h-100">
                <div class="card-body d-flex flex-column align-items-center">
                  <div class="text-muted small mb-2">Views</div>
                  <canvas id="donut-views" height="160"></canvas>
                  <div class="small mt-2 text-center" id="cap-views">—</div>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="card h-100">
                <div class="card-body d-flex flex-column align-items-center">
                  <div class="text-muted small mb-2">Likes</div>
                  <canvas id="donut-likes" height="160"></canvas>
                  <div class="small mt-2 text-center" id="cap-likes">—</div>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="card h-100">
                <div class="card-body d-flex flex-column align-items-center">
                  <div class="text-muted small mb-2">Comments</div>
                  <canvas id="donut-comments" height="160"></canvas>
                  <div class="small mt-2 text-center" id="cap-comments">—</div>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="card h-100">
                <div class="card-body d-flex flex-column align-items-center">
                  <div class="text-muted small mb-2">Shares</div>
                  <canvas id="donut-shares" height="160"></canvas>
                  <div class="small mt-2 text-center" id="cap-shares">—</div>
                </div>
              </div>
            </div>
          </div>

          <canvas id="engagementChart" class="mt-3" height="120"></canvas>

          <!-- Engagement summary (aggregated from submissions) -->
          <div class="row mt-3 gx-3 gy-2" id="eng-summary">
            <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Views</div><div class="fs-5" id="es-views">—</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Likes</div><div class="fs-5" id="es-likes">—</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Comments</div><div class="fs-5" id="es-comments">—</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Shares</div><div class="fs-5" id="es-shares">—</div></div></div></div>
          </div>

          <!-- KPI targets (from campaign.kpi_targets) -->
          <div class="mt-3" id="kpi-section">
            <div class="row gx-3 gy-2 d-none" id="kpi-targets">
              <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Target Views</div><div class="fs-6" id="kt-views">—</div></div></div></div>
              <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Target Likes</div><div class="fs-6" id="kt-likes">—</div></div></div></div>
              <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Target Comments</div><div class="fs-6" id="kt-comments">—</div></div></div></div>
              <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Target Shares</div><div class="fs-6" id="kt-shares">—</div></div></div></div>
            </div>
          </div>
        </div>

        <div class="w-100 w-lg-50" style="max-width:540px">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h5 class="mb-0">Campaign Aktif Saat Ini</h5>
            <a class="btn btn-sm btn-outline-primary app-link" href="/admin/campaigns">Lihat semua</a>
          </div>
          <ul class="list-group" id="active-campaigns">
            <li class="list-group-item text-muted">Memuat…</li>
          </ul>

          <div class="mt-4">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="mb-0">Brands</h5>
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

  // render header + breadcrumb
  renderHeader("header");
  renderBreadcrumb(target, path, labelOverride);

  // === destroy helper utk Chart.js
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
    } catch (e) {
      console.warn('[dashboard] destroyChartIfExists error:', e);
    }
  }

  await ensureChartJS();
  destroyChartIfExists('engagementChart');

  if (target.dataset.dashInstance !== INSTANCE_KEY) return;

  showLoader();

  // === Load KPI (global totals) ===
  try {
    const [brands, campaigns, submissions] = await Promise.all([
      brandService.getAll({ page: 1, per_page: 1 }),
      campaignService.getAll({ page: 1, per_page: 1 }),
      submissionService.getAll({ page: 1, per_page: 1 }),
    ]);

    if (target.dataset.dashInstance !== INSTANCE_KEY) return;

    const totalBrands = brands?.total ?? brands?.meta?.total ?? brands?.pagination?.total ?? (brands?.data?.length || 0);
    const totalCampaigns = campaigns?.total ?? campaigns?.meta?.total ?? campaigns?.pagination?.total ?? (campaigns?.data?.length || 0);
    const totalSubmissions = submissions?.total ?? submissions?.meta?.total ?? submissions?.pagination?.total ?? (submissions?.data?.length || 0);

    let totalKols = null;
    try {
      const regMod = await import(`/js/services/influencerRegistrationService.js?v=${v}`);
      if (target.dataset.dashInstance !== INSTANCE_KEY) return;
      const regs = await regMod.influencerService.getAll({ page: 1, per_page: 1 });
      totalKols = regs?.total ?? regs?.meta?.total ?? regs?.pagination?.total ?? null;
    } catch {
      const firstPage = submissions?.data || [];
      const distinct = new Set(firstPage.map(s => s.tiktok_user_id).filter(Boolean));
      totalKols = distinct.size;
    }

    $('#kpi-brands').textContent = fmt(totalBrands);
    $('#kpi-campaigns').textContent = fmt(totalCampaigns);
    $('#kpi-kols').textContent = fmt(totalKols);
    $('#kpi-posts').textContent = fmt(totalSubmissions);
  } catch (e) {
    console.error('Load KPIs error', e);
    showToast('Gagal memuat ringkasan KPI', 'error');
  }

  // === Populate campaign filter + cache KPI targets
  let currentCampaignId = "";
  const campaignBrandMap = new Map();
  const campaignKpiMap = new Map(); // cache KPI per campaign
  let cachedCampaignsForBrandList = [];

  try {
    const cs = await campaignService.getAll({ page: 1, per_page: 100, status: '', include: 'brand' });
    if (target.dataset.dashInstance !== INSTANCE_KEY) return;

    const items = cs?.data || [];
    cachedCampaignsForBrandList = items.slice();

    const campaignFilter = $('#campaignFilter');
    campaignFilter.innerHTML =
      `<option value="">— Pilih Campaign —</option>` +
      items.map(c => {
        const cname = escapeHtml(c.name || `Campaign ${c.id}`);
        const bname = escapeHtml(c.brand?.name || '-');
        campaignBrandMap.set(String(c.id), bname);
        const kt = c.kpi_targets || c.kpi || c.kpiTargets || null;
        if (kt) campaignKpiMap.set(String(c.id), kt);
        return `<option value="${c.id}">${cname} — ${bname}</option>`;
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

  // === Active campaigns list
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

  // === Charts ===
  const chartCanvas = $('#engagementChart');
  const chartCtx = chartCanvas.getContext('2d');

  window.__ADMIN_DASHBOARD_CHART__ ??= null;
  const donutIds = ['views','likes','comments','shares'];
  const donutCharts = Object.fromEntries(donutIds.map(id => [id, null]));

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

  // ==== KPI target helpers (including donuts) ====
  function applyKpiTargets(kpi) {
    const row = $('#kpi-targets');
    if (!row) return;

    const hasAny =
      kpi && (safe(kpi.views) || safe(kpi.likes) || safe(kpi.comments) || safe(kpi.shares));

    if (!hasAny) {
      row.classList.add('d-none');
      ['kt-views','kt-likes','kt-comments','kt-shares'].forEach(id => {
        const el = $('#'+id); if (el) el.textContent = '—';
      });
      // hide donuts if no KPI
      $('#kpi-donuts').style.display = 'none';
      destroyDonuts();
      return;
    }

    $('#kt-views').textContent    = kpi.views    != null ? fmt(Number(kpi.views))       : '—';
    $('#kt-likes').textContent    = kpi.likes    != null ? fmt(Number(kpi.likes))       : '—';
    $('#kt-comments').textContent = kpi.comments != null ? fmt(Number(kpi.comments))    : '—';
    $('#kt-shares').textContent   = kpi.shares   != null ? fmt(Number(kpi.shares))      : '—';

    row.classList.remove('d-none');
  }

  async function ensureCampaignKpi(campaignId) {
    if (!campaignId) return null;
    const key = String(campaignId);
    if (campaignKpiMap.has(key)) return campaignKpiMap.get(key);
    try {
      const detail = await campaignService.get(campaignId);
      const kpi = detail?.kpi_targets || detail?.kpi || detail?.kpiTargets || null;
      if (kpi) campaignKpiMap.set(key, kpi);
      return kpi;
    } catch {
      return null;
    }
  }

  function destroyDonuts() {
    for (const k of donutIds) {
      try {
        donutCharts[k]?.destroy?.();
        donutCharts[k] = null;
      } catch {}
      destroyChartIfExists(`donut-${k}`);
    }
  }

  function renderOneDonut(kind, actual, target) {
    const canvas = $(`#donut-${kind}`);
    const cap = $(`#cap-${kind}`);
    if (!canvas || !cap) return;

    // jika target <= 0 dan actual <= 0 → kosongkan
    if (!(Number(target) > 0) && !(Number(actual) > 0)) {
      cap.textContent = '—';
      if (donutCharts[kind]?.destroy) donutCharts[kind].destroy();
      donutCharts[kind] = null;
      return;
    }

    const T = Math.max(0, Number(target)||0);
    const A = Math.max(0, Number(actual)||0);
    const remain = Math.max(0, T - A);

    // caption progress
    const pct = T > 0 ? Math.min(100, Math.round((A/T)*100)) : 100;
    const capText = T > 0
      ? `${fmtShort(A)} / ${fmtShort(T)} (${pct}%)`
      : `${fmtShort(A)} (no KPI)`;
    cap.textContent = capText;

    // rebuild
    try { donutCharts[kind]?.destroy?.(); } catch {}
    destroyChartIfExists(`donut-${kind}`);

    donutCharts[kind] = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Actual','Remaining'],
        datasets: [{
          data: T > 0 ? [Math.min(A, T), remain] : [A, 0],
          backgroundColor: ['rgba(13,110,253,0.8)', 'rgba(200,200,200,0.45)'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        cutout: '65%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed;
                return `${ctx.label}: ${fmtShort(v)}`;
              }
            }
          }
        }
      }
    });
  }

  function renderKpiDonuts(totals, kpi) {
    const wrap = $('#kpi-donuts');
    if (!wrap) return;

    const hasAnyKpi = kpi && [kpi.views,kpi.likes,kpi.comments,kpi.shares].some(v => Number(v) > 0);
    // tampilkan row hanya jika ada minimal satu KPI > 0
    wrap.style.display = hasAnyKpi ? '' : 'none';
    if (!hasAnyKpi) { destroyDonuts(); return; }

    renderOneDonut('views',    totals.views,    kpi.views);
    renderOneDonut('likes',    totals.likes,    kpi.likes);
    renderOneDonut('comments', totals.comments, kpi.comments);
    renderOneDonut('shares',   totals.shares,   kpi.shares);
  }

  // sinkronisasi totals & kpi untuk donuts
  let lastTotals = { views:0, likes:0, comments:0, shares:0 };
  let lastKpi = null;

  async function loadCampaignEngagement(campaignId) {
    if (target.dataset.dashInstance !== INSTANCE_KEY) return;

    // tampilkan KPI (kalau ada) — tidak blocking chart
    ensureCampaignKpi(campaignId).then((kpi) => {
      if (target.dataset.dashInstance !== INSTANCE_KEY) return;
      lastKpi = kpi || null;
      applyKpiTargets(lastKpi);
      renderKpiDonuts(lastTotals, lastKpi);
    });

    if (!campaignId) {
      lastTotals = { views:0, likes:0, comments:0, shares:0 };
      renderKpiDonuts(lastTotals, lastKpi);
      renderChart(0,0,0,0);
      $('#es-views').textContent = '—';
      $('#es-likes').textContent = '—';
      $('#es-comments').textContent = '—';
      $('#es-shares').textContent = '—';
      return;
    }

    let page = 1;
    const perPage = 100;
    let lastPage = 1;

    const agg = { views: 0, likes: 0, comments: 0, shares: 0 };

    do {
      const res = await submissionService.getAll({
        page,
        per_page: perPage,
        include: '',
        campaign_id: campaignId,
      });

      if (target.dataset.dashInstance !== INSTANCE_KEY) return;

      const subs = res?.data || [];
      subs.forEach(s => {
        agg.views    += safe(Number(s.views_1))    + safe(Number(s.views_2));
        agg.likes    += safe(Number(s.likes_1))    + safe(Number(s.likes_2));
        agg.comments += safe(Number(s.comments_1)) + safe(Number(s.comments_2));
        agg.shares   += safe(Number(s.shares_1))   + safe(Number(s.shares_2));
      });

      lastPage = res?.last_page ?? res?.meta?.last_page ?? res?.pagination?.last_page ?? 1;
      page += 1;
    } while (page <= lastPage && page <= 5);

    lastTotals = agg;

    renderKpiDonuts(lastTotals, lastKpi);
    renderChart(agg.views, agg.likes, agg.comments, agg.shares);
    $('#es-views').textContent = fmt(agg.views);
    $('#es-likes').textContent = fmt(agg.likes);
    $('#es-comments').textContent = fmt(agg.comments);
    $('#es-shares').textContent = fmt(agg.shares);
  }

  // initial
  await loadCampaignEngagement(currentCampaignId);

  // events (scoped ke target)
  $('#campaignFilter').addEventListener('change', async (e) => {
    currentCampaignId = e.target.value || '';
    updateSelectedBrandLine(currentCampaignId);
    showLoader();
    try {
      await loadCampaignEngagement(currentCampaignId);
    } finally {
      hideLoader();
    }
  });

  $('#btnRefreshCampaign').addEventListener('click', async () => {
    if (!currentCampaignId) {
      showToast('Pilih campaign dulu ya.', 'error');
      return;
    }
    showLoader();
    try {
      await loadCampaignEngagement(currentCampaignId);
      showToast('Engagement diperbarui.');
    } catch (e) {
      showToast('Gagal memuat engagement.', 'error');
    } finally {
      hideLoader();
    }
  });

  // app-link navigation (scoped)
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

  // ===== helpers =====
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function updateSelectedBrandLine(campaignId) {
    const el = $('#selectedBrandLine');
    if (!el) return;
    if (!campaignId) {
      el.textContent = '—';
      return;
    }
    const brandName = campaignBrandMap.get(String(campaignId)) || '—';
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
          <div class="small text-muted">
            ${b.active} aktif • ${b.total} campaign
          </div>
        </div>
        <div>
          <span class="badge bg-primary me-1" title="Total campaign">${b.total}</span>
          <span class="badge bg-success" title="Active">${b.active}</span>
        </div>
      </li>
    `).join('');
  }
}

/** load Chart.js once (fallback kalau belum disertakan di layout) */
async function ensureChartJS() {
  if (window.Chart) return;
  await new Promise((resolve, reject) => {
    const id = 'chartjs-cdn';
    if (document.getElementById(id)) {
      document.getElementById(id).addEventListener('load', resolve);
      return;
    }
    const s = document.createElement('script');
    s.id = id;
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/** (opsional) panggil ini saat unmount/keluar dashboard untuk bersihkan chart */
export function cleanupAdminDashboard() {
  try {
    if (window.__ADMIN_DASHBOARD_CHART__?.destroy) {
      window.__ADMIN_DASHBOARD_CHART__.destroy();
    }
  } catch {}
  window.__ADMIN_DASHBOARD_CHART__ = null;

  if (window.Chart && typeof Chart.getChart === 'function') {
    const canvasEl = document.getElementById('engagementChart');
    const prev = Chart.getChart('engagementChart') || (canvasEl ? Chart.getChart(canvasEl) : null);
    if (prev?.destroy) prev.destroy();
  }

  // donuts
  ['donut-views','donut-likes','donut-comments','donut-shares'].forEach(id => {
    try {
      const prev = Chart.getChart?.(id) || null;
      prev?.destroy?.();
    } catch {}
  });
}
