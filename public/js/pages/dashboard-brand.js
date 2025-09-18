// /js/pages/brand/dashboard.js
export async function render(target, path, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();

  // instance guard
  const INSTANCE_KEY = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  target.dataset.brandDashInstance = INSTANCE_KEY;

  target.innerHTML = "";

  const [
    headerMod,
    breadcrumbMod,
    loaderMod,
    toastMod,
    brandMod,
    campaignMod,
    submissionMod,
    registrationMod, // <-- NEW
  ] = await Promise.all([
    import(`/js/components/header.js?v=${v}`),
    import(`/js/components/breadcrumb.js?v=${v}`),
    import(`/js/components/loader.js?v=${v}`),
    import(`/js/utils/toast.js?v=${v}`),
    import(`/js/services/brandService.js?v=${v}`),
    import(`/js/services/campaignService.js?v=${v}`),
    import(`/js/services/influencerSubmissionService.js?v=${v}`),
    import(`/js/services/influencerRegistrationService.js?v=${v}`), // <-- NEW
  ]);

  if (target.dataset.brandDashInstance !== INSTANCE_KEY) return;

  const { renderHeader } = headerMod;
  const { renderBreadcrumb } = breadcrumbMod;
  const { showLoader, hideLoader } = loaderMod;
  const { showToast } = toastMod;
  const { brandService } = brandMod;
  const { campaignService } = campaignMod;
  const { submissionService } = submissionMod;
  const { influencerService } = registrationMod; // <-- NEW

  // helpers
  const $  = (sel) => target.querySelector(sel);
  const $$ = (sel) => Array.from(target.querySelectorAll(sel));
  const fmt = (n) => (n === 0 || n ? Number(n).toLocaleString('id-ID') : '0');
  const safe = (x) => (x ?? 0);
  const fmtShort = (n) => {
    const x = Number(n) || 0;
    if (x >= 1e9) return (x/1e9).toFixed(1) + 'B';
    if (x >= 1e6) return (x/1e6).toFixed(1) + 'M';
    if (x >= 1e3) return (x/1e3).toFixed(1) + 'K';
    return x.toLocaleString('id-ID');
  };

  // JSON helpers
  const parseMaybeJSON = (val) => {
    if (!val) return null;
    if (typeof val === 'string') { try { return JSON.parse(val); } catch { return null; } }
    if (typeof val === 'object') return val;
    return null;
  };
  const unwrapCampaign = (obj) => (obj?.data ?? obj?.campaign ?? obj ?? null);

  // layout
  target.innerHTML = `
    <div id="brand-dashboard-root">
      <div id="__breadcrumb_mount"></div>

      <!-- KPI cards (optional) -->
      <div class="row g-3 mb-2 d-none" id="kpi-cards">
        <div class="col-md-3">
          <div class="dashboard-card text-center h-100 brand">
            <div class="dashboard-card-body">
              <h6 class="card-title">BRAND</h6>
              <p class="card-text fs-6 fw-semibold mb-0" id="kpi-brand-name">-</p>
              <div class="small text-muted" id="kpi-brand-id"></div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="dashboard-card text-center h-100 campaign">
            <div class="card-body">
              <h6 class="card-title">CAMPAIGNS</h6>
              <p class="card-text fs-3 fw-bold" id="kpi-campaigns">-</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="dashboard-card  text-center h-100 registration">
            <div class="card-body">
              <h6 class="card-title">KOL</h6>
              <p class="card-text fs-3 fw-bold" id="kpi-kols">-</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="dashboard-card text-center h-100 content">
            <div class="card-body">
              <h6 class="card-title">POST</h6>
              <p class="card-text fs-3 fw-bold" id="kpi-posts">-</p>
            </div>
          </div>
        </div>
      </div>

      <!-- chart + right column -->
      <div class="d-flex flex-column flex-lg-row gap-4 mb-5 pt-2">
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h6 class="mb-1 text-uppercase fw-bold">
                <i class="bi bi-pie-chart-fill"></i> Campaign Engagement
              </h6>
            </div>
            <div class="d-flex gap-2 align-items-start">
              <select id="campaignFilter" class="form-select form-select-sm" style="min-width:280px">
                <option value="">- Pilih Campaign -</option>
              </select>
              <button class="btn btn-outline-secondary btn-sm" id="btnRefreshCampaign" title="Refresh grafik">
                <i class="bi bi-arrow-clockwise"></i>
              </button>
            </div>
          </div>

          <!-- Donut KPI (views/likes/comments/shares) -->
          <div class="row g-3" id="kpi-donuts" style="display:none;">
            <div class="col-6 col-md-3">
              <div class="card h-100">
                <div class="card-body d-flex flex-column align-items-center">
                  <div class="text-muted small mb-2">Views</div>
                  <canvas id="donut-views" height="160"></canvas>
                  <div class="small mt-2 text-center" id="cap-views">-</div>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="card h-100">
                <div class="card-body d-flex flex-column align-items-center">
                  <div class="text-muted small mb-2">Likes</div>
                  <canvas id="donut-likes" height="160"></canvas>
                  <div class="small mt-2 text-center" id="cap-likes">-</div>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="card h-100">
                <div class="card-body d-flex flex-column align-items-center">
                  <div class="text-muted small mb-2">Comments</div>
                  <canvas id="donut-comments" height="160"></canvas>
                  <div class="small mt-2 text-center" id="cap-comments">-</div>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="card h-100">
                <div class="card-body d-flex flex-column align-items-center">
                  <div class="text-muted small mb-2">Shares</div>
                  <canvas id="donut-shares" height="160"></canvas>
                  <div class="small mt-2 text-center" id="cap-shares">-</div>
                </div>
              </div>
            </div>
          </div>

          <canvas id="engagementChart" class="mt-3" height="120"></canvas>

          <!-- Engagement summary -->
          <div class="row mt-3 gx-3 gy-2" id="eng-summary">
            <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Views</div><div class="fs-5" id="es-views">-</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Likes</div><div class="fs-5" id="es-likes">-</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Comments</div><div class="fs-5" id="es-comments">-</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Shares</div><div class="fs-5" id="es-shares">-</div></div></div></div>
          </div>

          <!-- KPI targets (views/likes/comments/shares) -->
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

          <!-- TOTAL CONTENT -> 2 box (Info & Donut) -->
          <div id="content-summary-row" class="row g-3 mb-3 d-none">
            <div class="col-12 col-md-6">
              <div class="dashboard-card h-100">
                <div class="card-body">
                  <h6 class="card-title mb-2"><i class="bi bi-card-list"></i> CONTENT SUMMARY</h6>

                  <!-- Info rows -->
                  <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <div class="small text-muted text-uppercase fs-12 fw-semibold">
                      <i class="bi bi-bullseye"></i> Target
                    </div>
                    <div class="fs-5 fw-bold" id="kpi-posts-target">-</div>
                  </div>
                  <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <div class="small text-muted text-uppercase fs-12 fw-semibold">
                      <i class="bi bi-card-checklist"></i> Sudah Dibuat
                    </div>
                    <div class="fs-6 fw-semibold" id="kpi-posts-created">-</div>
                  </div>

                  <!-- Status rows (placeholder 0) -->
                  <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <div class="small text-muted text-uppercase fs-12 fw-semibold">
                      <i class="bi bi-hourglass-split"></i> Waiting Draft
                    </div>
                    <div class="fs-6 fw-semibold" id="kpi-posts-waiting-draft">0</div>
                  </div>
                  <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <div class="small text-muted text-uppercase fs-12 fw-semibold">
                      <i class="bi bi-hourglass-split"></i> Waiting for Approval
                    </div>
                    <div class="fs-6 fw-semibold" id="kpi-posts-waiting-approval">0</div>
                  </div>
                  <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <div class="small text-muted text-uppercase fs-12 fw-semibold">
                      <i class="bi bi-pencil-square"></i> On Revision
                    </div>
                    <div class="fs-6 fw-semibold" id="kpi-posts-revision">0</div>
                  </div>
                  <div class="d-flex justify-content-between align-items-center py-1">
                    <div class="small text-muted text-uppercase fs-12 fw-semibold">
                      <i class="bi bi-arrow-right-square"></i> Ready to Post
                    </div>
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

          <!-- NEW: KOL progress (campaign terpilih) -->
          <div class="d-flex justify-content-between align-items-center mb-2 d-none" id="kol-stats-header">
            <h6 class="mb-0 text-uppercase fw-bold"><i class="bi bi-people"></i> KOL SUMMARY (Campaign Terpilih)</h6>
          </div>
          <ul class="list-group d-none" id="kol-stats-list">
            <li class="list-group-item text-muted">Pilih campaign…</li>
          </ul>

          <!-- Active campaigns for this brand -->
          <div class="d-flex justify-content-between align-items-center mt-3 mb-2">
            <h6 class="mb-0 text-uppercase fw-bold">
              <i class="bi bi-list"></i> Campaign Aktif Brand Ini
            </h6>
          </div>
          <ul class="list-group" id="active-campaigns">
            <li class="list-group-item text-muted">Memuat…</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  renderHeader('header');
  renderBreadcrumb(target, path, labelOverride);

  await ensureChartJS();
  destroyChartIfExists('engagementChart');

  if (target.dataset.brandDashInstance !== INSTANCE_KEY) return;
  showLoader();

  // ====== Ambil brand user yang login
  async function getMyBrand() {
    const g = (window.CURRENT_USER || window.__AUTH_USER__ || {});
    if (g?.brand_id || g?.brand?.id) {
      return { id: g.brand_id ?? g.brand?.id ?? null, name: g.brand?.name ?? g.brand_name ?? '-' };
    }
    try {
      const res = await fetch('/api/me?include=brand', { credentials: 'include' });
      if (res.ok) {
        const me = await res.json();
        return { id: me.brand_id ?? me.brand?.id ?? null, name: me.brand?.name ?? '-' };
      }
    } catch {}
    return { id: null, name: '-' };
  }

  // ==== destroy helper utk Chart.js
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

  // ==== donut/chart builders
  const donutIds = ['views','likes','comments','shares'];
  const donutCharts = Object.fromEntries(donutIds.map(id => [id, null]));
  let contentDonut = null;

  function destroyDonuts() {
    for (const k of donutIds) {
      try { donutCharts[k]?.destroy?.(); donutCharts[k] = null; } catch {}
      destroyChartIfExists(`donut-${k}`);
    }
    try { contentDonut?.destroy?.(); } catch {}
    contentDonut = null;
    destroyChartIfExists('donut-content');
  }

  function renderOneDonut(kind, actual, targetVal) {
    const canvas = $(`#donut-${kind}`);
    const cap = $(`#cap-${kind}`);
    if (!canvas || !cap) return;

    if (!(Number(targetVal) > 0) && !(Number(actual) > 0)) {
      cap.textContent = '-';
      try { donutCharts[kind]?.destroy?.(); } catch {}
      donutCharts[kind] = null;
      destroyChartIfExists(`donut-${kind}`);
      return;
    }

    const T = Math.max(0, Number(targetVal)||0);
    const A = Math.max(0, Number(actual)||0);
    const remain = Math.max(0, T - A);
    const pct = T > 0 ? Math.min(100, Math.round((A/T)*100)) : 100;
    cap.textContent = T > 0 ? `${fmtShort(A)} / ${fmtShort(T)} (${pct}%)` : `${fmtShort(A)} (no KPI)`;

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
      options: { responsive: true, cutout: '65%', plugins: { legend: { display: false } } }
    });
  }

  function renderContentDonut(actual, targetVal) {
    const canvas = $('#donut-content');
    const cap = $('#cap-content');
    if (!canvas || !cap) return;

    if (!(Number(targetVal) > 0) && !(Number(actual) > 0)) {
      cap.textContent = '-';
      try { contentDonut?.destroy?.(); } catch {}
      contentDonut = null;
      destroyChartIfExists('donut-content');
      return;
    }

    const T = Math.max(0, Number(targetVal)||0);
    const A = Math.max(0, Number(actual)||0);
    const remain = Math.max(0, T - A);
    const pct = T > 0 ? Math.min(100, Math.round((A/T)*100)) : 100;
    cap.textContent = T > 0 ? `${fmtShort(A)} / ${fmtShort(T)} (${pct}%)` : `${fmtShort(A)} (no target)`;

    try { contentDonut?.destroy?.(); } catch {}
    destroyChartIfExists('donut-content');

    contentDonut = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Dibuat','Sisa'],
        datasets: [{
          data: T > 0 ? [Math.min(A, T), remain] : [A, 0],
          backgroundColor: ['rgba(25,135,84,0.85)', 'rgba(200,200,200,0.45)'],
          borderWidth: 0
        }]
      },
      options: { responsive: true, cutout: '65%', plugins: { legend: { display: false } } }
    });
  }

  function renderKpiDonuts(totals, kpi) {
    const wrap = $('#kpi-donuts');
    if (!wrap) return;
    const hasAnyKpi = kpi && [kpi.views,kpi.likes,kpi.comments,kpi.shares].some(v => Number(v) > 0);
    wrap.style.display = hasAnyKpi ? '' : 'none';
    if (!hasAnyKpi) { destroyDonuts(); return; }
    renderOneDonut('views', totals.views, kpi.views);
    renderOneDonut('likes', totals.likes, kpi.likes);
    renderOneDonut('comments', totals.comments, kpi.comments);
    renderOneDonut('shares', totals.shares, kpi.shares);
  }

  function renderChart(views, likes, comments, shares) {
    const canvas = $('#engagementChart');
    const ctx = canvas.getContext('2d');
    destroyChartIfExists('engagementChart');
    new Chart(ctx, {
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
  }

  // === helpers: fields & total konten dari link_1..link_5
  function isFilled(v) {
    if (v == null) return false;
    const s = String(v).trim();
    if (!s) return false;
    if (s.toUpperCase() === 'NULL') return false;
    return true;
  }
  function getField(obj, names) {
    if (!obj) return undefined;
    for (const n of names) {
      if (n in obj) return obj[n];
    }
    return undefined;
  }
  function countSubmissionPosts(sub) {
    if (!sub || typeof sub !== 'object') return 0;
    let count = 0;
    for (let i = 1; i <= 5; i++) {
      const key = `link_${i}`;
      if (isFilled(sub[key])) count += 1;
    }
    return count;
  }

  // ===== get brand context
  const myBrand = await getMyBrand();
  if (!myBrand.id) {
    $('#kpi-brand-name').textContent = '—';
    $('#kpi-brand-id').textContent = 'Akun brand belum terhubung';
    hideLoader();
    showToast('Akun brand belum terhubung. Hubungkan brand di profil user.', 'error');
    return;
  }
  $('#kpi-brand-name').textContent = myBrand.name || '(Tanpa nama)';
  $('#kpi-brand-id').textContent = `ID: ${myBrand.id}`;

  // ===== KPI global utk brand (opsional)
  try {
    const cs = await campaignService.getAll({ page: 1, per_page: 100, brand_id: myBrand.id, include: 'brand' });
    const campaigns = cs?.data || [];
    const totalCampaigns = cs?.total ?? cs?.meta?.total ?? cs?.pagination?.total ?? campaigns.length;

    let totalPosts = 0;
    const kolSet = new Set();

    const capped = campaigns.slice(0, 50);
    for (const c of capped) {
      const sres = await submissionService.getAll({ page: 1, per_page: 1, campaign_id: c.id });
      const t = sres?.total ?? sres?.meta?.total ?? sres?.pagination?.total ?? (sres?.data?.length || 0);
      totalPosts += Number(t) || 0;

      const sres2 = await submissionService.getAll({ page: 1, per_page: 100, campaign_id: c.id });
      (sres2?.data || []).forEach(s => {
        const key = String(s.tiktok_user_id ?? s.influencer_id ?? s.creator_id ?? s.user_id ?? s.id);
        kolSet.add(key);
      });
    }

    $('#kpi-campaigns').textContent = fmt(totalCampaigns);
    $('#kpi-posts').textContent = fmt(totalPosts);
    $('#kpi-kols').textContent = fmt(kolSet.size);
  } catch (e) {
    console.error('Load brand KPIs error', e);
    showToast('Gagal memuat KPI brand', 'error');
  }

  // === Populate campaign filter (brand only) + cache KPI targets
  let currentCampaignId = "";
  const campaignKpiMap = new Map();

  try {
    const cs = await campaignService.getAll({ page: 1, per_page: 100, brand_id: myBrand.id, include: 'brand' });
    const items = cs?.data || [];

    const campaignFilter = $('#campaignFilter');
    campaignFilter.innerHTML =
      `<option value="">- Pilih Campaign -</option>` +
      items.map(c => {
        const cname = escapeHtml(c.name || `Campaign ${c.id}`);
        const kt = parseMaybeJSON(c.kpi_targets) || parseMaybeJSON(c.kpi) || parseMaybeJSON(c.kpiTargets) || null;
        if (kt) campaignKpiMap.set(String(c.id), kt);
        return `<option value="${c.id}">${cname}</option>`;
      }).join('');

    const qId = query?.campaign_id || new URL(location.href).searchParams.get('campaign_id');
    if (qId && campaignFilter.querySelector(`option[value="${qId}"]`)) {
      campaignFilter.value = qId;
      currentCampaignId = qId;
    }
  } catch (e) {
    console.error('Load campaigns error', e);
  }

  // === Active campaigns list (brand only)
  try {
    const active = await campaignService.getAll({ page: 1, per_page: 8, status: 'active', brand_id: myBrand.id, include: 'brand' });
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
              <div class="small text-muted">${escapeHtml(myBrand.name || '-')}</div>
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

  // === KPI target helpers (including donuts)
  function applyKpiTargets(kpi) {
    const row = $('#kpi-targets');
    if (!row) return;
    const hasAny = kpi && (safe(kpi.views) || safe(kpi.likes) || safe(kpi.comments) || safe(kpi.shares));
    if (!hasAny) {
      row.classList.add('d-none');
      ['kt-views','kt-likes','kt-comments','kt-shares'].forEach(id => { const el = $('#'+id); if (el) el.textContent = '-'; });
      $('#kpi-donuts').style.display = 'none'; destroyDonuts(); return;
    }
    $('#kt-views').textContent    = kpi.views    != null ? fmt(Number(kpi.views))    : '-';
    $('#kt-likes').textContent    = kpi.likes    != null ? fmt(Number(kpi.likes))    : '-';
    $('#kt-comments').textContent = kpi.comments != null ? fmt(Number(kpi.comments)) : '-';
    $('#kt-shares').textContent   = kpi.shares   != null ? fmt(Number(kpi.shares))   : '-';
    row.classList.remove('d-none');
  }

  async function ensureCampaignKpi(campaignId) {
    if (!campaignId) return null;
    if (campaignKpiMap.has(String(campaignId))) return campaignKpiMap.get(String(campaignId));
    try {
      const detail = await campaignService.get(campaignId);
      const c = unwrapCampaign(detail);
      const raw = c?.kpi_targets ?? c?.kpi ?? c?.kpiTargets ?? null;
      const kpi = parseMaybeJSON(raw) || (typeof raw === 'object' ? raw : null);
      if (kpi) campaignKpiMap.set(String(campaignId), kpi);
      return kpi;
    } catch { return null; }
  }

  // ===== TARGET TOTAL KONTEN: dari kpi_targets.contents (fallback content)
  async function getCampaignContentTarget(campaignId) {
    if (!campaignId) return null;
    const kpi = await ensureCampaignKpi(campaignId);
    const raw = (kpi?.contents ?? kpi?.content);
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  // ===== KOL progress UI helpers (UPDATED: + kolTotal)
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
        <div>
          <div class="fw-semibold">KOL Sudah Beli</div>
          <div class="small text-muted">invoice terunggah</div>
        </div>
        <span class="badge bg-primary">${fmt(buyCount)}</span>
      </li>
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <div class="fw-semibold">KOL Sudah Rating</div>
          <div class="small text-muted">bukti rating terunggah</div>
        </div>
        <span class="badge bg-success">${fmt(rateCount)}</span>
      </li>
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <div class="fw-semibold">KOL Dapat Resi</div>
          <div class="small text-muted">courier & tracking ada</div>
        </div>
        <span class="badge bg-warning text-dark">${fmt(shipCount)}</span>
      </li>
    `;
  }
  function hideKolStats() {
    $('#kol-stats-header')?.classList.add('d-none');
    const list = $('#kol-stats-list');
    if (list) {
      list.classList.add('d-none');
      list.innerHTML = `<li class="list-group-item text-muted">Pilih campaign…</li>`;
    }
  }

  // sinkronisasi totals & kpi untuk donuts
  let lastTotals = { views:0, likes:0, comments:0, shares:0 };
  let lastKpi = null;

  async function loadCampaignEngagement(campaignId) {
    if (target.dataset.brandDashInstance !== INSTANCE_KEY) return;

    ensureCampaignKpi(campaignId).then((kpi) => {
      if (target.dataset.brandDashInstance !== INSTANCE_KEY) return;
      lastKpi = kpi || null; applyKpiTargets(lastKpi); renderKpiDonuts(lastTotals, lastKpi || {});
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
      destroyChartIfExists('donut-content');
      try { contentDonut?.destroy?.(); } catch {}
      contentDonut = null;
      $('#cap-content') && ($('#cap-content').textContent = '-');

      hideKolStats();
      hideLoader();
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

    const targetPromise = getCampaignContentTarget(campaignId).catch(()=>null);

    // Aggregasi engagement, total konten & KOL progress
    let page = 1;
    const perPage = 100;
    let lastPage = 1;

    const agg = { views: 0, likes: 0, comments: 0, shares: 0 };
    let totalPostedContents = 0;

    const buyerSet  = new Set();
    const ratingSet = new Set();
    const shipSet   = new Set();

    const kolKeyOf = (s) => String(
      s.tiktok_user_id ?? s.influencer_id ?? s.creator_id ?? s.user_id ?? s.id
    );

    do {
      const res = await submissionService.getAll({
        page, per_page: perPage, include: '', campaign_id: campaignId,
      });
      if (target.dataset.brandDashInstance !== INSTANCE_KEY) return;

      const subs = res?.data || [];
      subs.forEach(s => {
        agg.views    += safe(Number(s.views_1))    + safe(Number(s.views_2));
        agg.likes    += safe(Number(s.likes_1))    + safe(Number(s.likes_2));
        agg.comments += safe(Number(s.comments_1)) + safe(Number(s.comments_2));
        agg.shares   += safe(Number(s.shares_1))   + safe(Number(s.shares_2));

        totalPostedContents += countSubmissionPosts(s);

        // progress KOL
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

    // ===== JUMLAH KOL JOIN (NEW)
    let kolCount = 0;
    try {
      const regs = await influencerService.getAll({ page: 1, per_page: 1, campaign_id: campaignId });
      kolCount = regs?.total ?? regs?.meta?.total ?? regs?.pagination?.total ?? 0;
    } catch { kolCount = 0; }

    // Render KOL summary (+kolCount)
    renderKolStats(buyerSet.size, ratingSet.size, shipSet.size, kolCount);

    hideLoader();
  }

  // initial
  await loadCampaignEngagement(currentCampaignId);

  // events
  $('#campaignFilter').addEventListener('change', async (e) => {
    currentCampaignId = e.target.value || '';
    showLoader();
    try { await loadCampaignEngagement(currentCampaignId); }
    finally { hideLoader(); }
  });

  $('#btnRefreshCampaign').addEventListener('click', async () => {
    if (!currentCampaignId) {
      showToast('Pilih campaign dulu ya.', 'error'); return;
    }
    showLoader();
    try { await loadCampaignEngagement(currentCampaignId); showToast('Engagement diperbarui.'); }
    catch { showToast('Gagal memuat engagement.', 'error'); }
    finally { hideLoader(); }
  });

  // nav
  $$('.app-link').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const href = el.getAttribute('href'); if (!href) return;
      history.pushState(null, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  });

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
}

/** load Chart.js once */
async function ensureChartJS() {
  if (window.Chart) return;
  await new Promise((resolve, reject) => {
    const id = 'chartjs-cdn';
    if (document.getElementById(id)) {
      document.getElementById(id).addEventListener('load', resolve); return;
    }
    const s = document.createElement('script');
    s.id = id; s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    s.async = true; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

/** optional cleanup */
export function cleanupBrandDashboard() {
  try { if (window.Chart && typeof Chart.getChart === 'function') {
    const prev = Chart.getChart('engagementChart') || null; prev?.destroy?.();
  }} catch {}
  ['donut-views','donut-likes','donut-comments','donut-shares','donut-content'].forEach(id => {
    try { const prev = Chart.getChart?.(id) || null; prev?.destroy?.(); } catch {}
  });
}
