// /js/pages/admin/dashboard.js
export async function render(target, path, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();
  target.innerHTML = "";

  // --- dynamic imports (cache-busted) ---
  const [
    headerMod,
    breadcrumbMod,
    loaderMod,
    toastMod,
    brandMod,
    campaignMod,
    submissionMod,
    // influencer registration service optional (kalau ada)
  ] = await Promise.all([
    import(`../../components/header.js?v=${v}`),
    import(`../../components/breadcrumb.js?v=${v}`),
    import(`../../components/loader.js?v=${v}`),
    import(`../../utils/toast.js?v=${v}`),
    import(`../../services/brandService.js?v=${v}`),
    import(`../../services/campaignService.js?v=${v}`),
    import(`../../services/influencerSubmissionService.js?v=${v}`),
  ]);

  const { renderHeader } = headerMod;
  const { renderBreadcrumb } = breadcrumbMod;
  const { showLoader, hideLoader } = loaderMod;
  const { showToast } = toastMod;
  const { brandService } = brandMod;
  const { campaignService } = campaignMod;
  const { submissionService } = submissionMod;

  // Helpers
  const $ = (sel) => document.querySelector(sel);
  const fmt = (n) => (n === 0 || n ? Number(n).toLocaleString('id-ID') : '0');
  const safe = (x) => (x ?? 0);
  const sum = (arr) => arr.reduce((a, b) => a + (Number(b) || 0), 0);

  // inject layout
  target.innerHTML += `
    <div class="container-fluid">
      <!-- header + breadcrumb -->
      <div id="__breadcrumb_mount"></div>

      <!-- KPI cards -->
      <div class="row g-3 mb-4" id="kpi-cards">
        <div class="col-md-3">
          <div class="card text-white text-center bg-success h-100">
            <div class="card-body">
              <h5 class="card-title">Total Brand</h5>
              <p class="card-text fs-3" id="kpi-brands">—</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-white text-center bg-primary h-100">
            <div class="card-body">
              <h5 class="card-title">Total Campaign</h5>
              <p class="card-text fs-3" id="kpi-campaigns">—</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-white text-center bg-danger h-100">
            <div class="card-body">
              <h5 class="card-title">Total KOL (registrations)</h5>
              <p class="card-text fs-3" id="kpi-kols">—</p>
              <div class="small text-white-50">*jumlah registrasi, bukan unik</div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-white text-center bg-warning h-100">
            <div class="card-body">
              <h5 class="card-title">Total Submissions</h5>
              <p class="card-text fs-3" id="kpi-posts">—</p>
            </div>
          </div>
        </div>
      </div>

      <!-- chart + active campaigns -->
      <div class="d-flex flex-column flex-lg-row gap-4 mb-5 pt-2">
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="mb-0">Total Engagement per Campaign</h5>
            <div class="d-flex gap-2">
              <select id="campaignFilter" class="form-select form-select-sm" style="min-width:260px">
                <option value="">— Pilih Campaign —</option>
              </select>
              <button class="btn btn-outline-secondary btn-sm" id="btnRefreshCampaign">
                <i class="bi bi-arrow-clockwise"></i> Refresh
              </button>
            </div>
          </div>
          <canvas id="engagementChart" height="120"></canvas>
          <div class="row mt-3 gx-3 gy-2" id="eng-summary">
            <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Views</div><div class="fs-5" id="es-views">—</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Likes</div><div class="fs-5" id="es-likes">—</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Comments</div><div class="fs-5" id="es-comments">—</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2"><div class="text-muted small">Shares</div><div class="fs-5" id="es-shares">—</div></div></div></div>
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
        </div>
      </div>
    </div>
  `;

  // render header + breadcrumb
  renderHeader("header");
  renderBreadcrumb(target, path, labelOverride);

  // Ensure Chart.js loaded (jaga-jaga)
  await ensureChartJS();

  showLoader();

  // === Load KPI (global totals) ===
  try {
    // ambil total tanpa tarik banyak data: per_page=1 lalu baca meta.total
    const [brands, campaigns, submissions] = await Promise.all([
      brandService.getAll({ page: 1, per_page: 1 }),
      campaignService.getAll({ page: 1, per_page: 1 }),
      submissionService.getAll({ page: 1, per_page: 1 }),
    ]);

    // beberapa backend pakai "total", ada yang pakai "meta.total"
    const totalBrands = brands?.total ?? brands?.meta?.total ?? brands?.pagination?.total ?? (brands?.data?.length || 0);
    const totalCampaigns = campaigns?.total ?? campaigns?.meta?.total ?? campaigns?.pagination?.total ?? (campaigns?.data?.length || 0);
    const totalSubmissions = submissions?.total ?? submissions?.meta?.total ?? submissions?.pagination?.total ?? (submissions?.data?.length || 0);

    // KOL registrations: kalau ada endpoint registrasi, ambil; kalau tidak, pakai perkiraan distinct di submissions (fallback)
    let totalKols = null;
    try {
      const regMod = await import(`../../services/influencerRegistrationService.js?v=${v}`);
      const regs = await regMod.influencerService.getAll({ page: 1, per_page: 1 });
      totalKols = regs?.total ?? regs?.meta?.total ?? regs?.pagination?.total ?? null;
    } catch {
      // fallback: distinct tiktok_user_id dari halaman submissions pertama (kurang akurat, tapi better than nothing)
      const firstPage = submissions?.data || [];
      const distinct = new Set(firstPage.map(s => s.tiktok_user_id).filter(Boolean));
      totalKols = distinct.size; // NB: hanya dari page 1
    }

    $('#kpi-brands').textContent = fmt(totalBrands);
    $('#kpi-campaigns').textContent = fmt(totalCampaigns);
    $('#kpi-kols').textContent = fmt(totalKols);
    $('#kpi-posts').textContent = fmt(totalSubmissions);
  } catch (e) {
    console.error('Load KPIs error', e);
    showToast('Gagal memuat ringkasan KPI', 'error');
  }

  // === Populate campaign filter ===
  let currentCampaignId = "";
  try {
    const cs = await campaignService.getAll({ page: 1, per_page: 100, status: '' });
    const items = cs?.data || [];
    const campaignFilter = $('#campaignFilter');
    campaignFilter.innerHTML =
      `<option value="">— Pilih Campaign —</option>` +
      items.map(c => `<option value="${c.id}">${escapeHtml(c.name || `Campaign ${c.id}`)}</option>`).join('');

    // auto pilih dari query (jika ada)
    const qId = query?.campaign_id || new URL(location.href).searchParams.get('campaign_id');
    if (qId && campaignFilter.querySelector(`option[value="${qId}"]`)) {
      campaignFilter.value = qId;
      currentCampaignId = qId;
    }
  } catch (e) {
    console.error('Load campaigns error', e);
  }

  // === Active campaigns list ===
  try {
    const active = await campaignService.getAll({ page: 1, per_page: 8, status: 'active', include: 'brand' });
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

  // === Chart per-campaign ===
  const chartCtx = $('#engagementChart').getContext('2d');
  let chartInstance = null;

  const renderChart = (views, likes, comments, shares) => {
    if (chartInstance) chartInstance.destroy();
    chartInstance = new window.Chart(chartCtx, {
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
          barThickness: 64,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  };

  async function loadCampaignEngagement(campaignId) {
    if (!campaignId) {
      renderChart(0,0,0,0);
      $('#es-views').textContent = '—';
      $('#es-likes').textContent = '—';
      $('#es-comments').textContent = '—';
      $('#es-shares').textContent = '—';
      return;
    }

    // ambil semua submissions campaign ini (paginate beberapa page kalau perlu)
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

      const subs = res?.data || [];
      subs.forEach(s => {
        // slot1
        agg.views    += safe(Number(s.views_1));
        agg.likes    += safe(Number(s.likes_1));
        agg.comments += safe(Number(s.comments_1));
        agg.shares   += safe(Number(s.shares_1));
        // slot2
        agg.views    += safe(Number(s.views_2));
        agg.likes    += safe(Number(s.likes_2));
        agg.comments += safe(Number(s.comments_2));
        agg.shares   += safe(Number(s.shares_2));
      });

      lastPage = res?.last_page ?? res?.meta?.last_page ?? res?.pagination?.last_page ?? 1;
      page += 1;
    } while (page <= lastPage && page <= 5); // batasi 5 halaman biar ga berat

    renderChart(agg.views, agg.likes, agg.comments, agg.shares);
    $('#es-views').textContent = fmt(agg.views);
    $('#es-likes').textContent = fmt(agg.likes);
    $('#es-comments').textContent = fmt(agg.comments);
    $('#es-shares').textContent = fmt(agg.shares);
  }

  // initial: kalau filter sudah terpilih dari query
  await loadCampaignEngagement(currentCampaignId);

  // events
  $('#campaignFilter').addEventListener('change', async (e) => {
    currentCampaignId = e.target.value || '';
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

  // app-link navigation
  document.querySelectorAll('.app-link').forEach(el => {
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
