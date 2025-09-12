// /js/pages/admin/submissions-list.js
export async function render(target, path, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();

  // Dynamic imports dengan cache-buster
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
    import(`../../services/influencerSubmissionService.js?v=${v}`), // harus punya refreshMetrics(id)
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

  const $ = (sel) => document.querySelector(sel);
  const campaignFilter = $('#campaignFilter');
  const searchInput = $('#searchInput');
  const listWrap = $('#submission-list');
  const pager = $('#pagination');
  const refreshAllBtn = $('.btn-refresh-all');

  // Helpers
  const toUrl = (p) => {
    if (!p) return null;
    if (/^https?:\/\//i.test(p)) return p;
    return `/storage/${String(p).replace(/^\/?storage\/?/, '')}`;
  };
  const fmtDate = (s) => (s ? new Date(s).toLocaleDateString('id-ID') : '—');
  const fmtNum  = (n) => (n === 0 || n ? Number(n).toLocaleString('id-ID') : '—');

  // Ambil nama tampilan KOL
  const kolNameOf = (s) => {
    return (
      s.full_name ||
      (s.tiktok_username ? `@${s.tiktok_username}` : null) ||
      s.display_name ||
      s.tiktok_display_name ||
      s.name ||
      s.creator_name ||
      s.influencer_name ||
      s.user_name ||
      '—'
    );
  };

  // Ambil metric per slot (fallback total)
  const metric = (s, slot, base) => {
    const keys = [
      `${base}_${slot}`,
      `${base}${slot}`,
      `${base}_${slot}_count`,
      `${base}${slot}_count`,
      base,
      `${base}_count`,
    ];
    for (const k of keys) {
      if (k in s && s[k] != null) return s[k];
    }
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
  } catch {
    // ignore
  }

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

      // Filter keyword (nama, open_id, link)
      const kw = (currentKeyword || '').toLowerCase().trim();
      const filtered = kw
        ? arr.filter(s => {
            const name = kolNameOf(s);
            const hay = [
              name,
              s.tiktok_user_id || '',
              s.link_1 || '',
              s.link_2 || '',
            ].join(' ').toLowerCase();
            return hay.includes(kw);
          })
        : arr;

      // Group per open_id (tetap group by open_id; tampilannya pakai nama)
      const groups = new Map();
      filtered.forEach((s) => {
        const key = s.tiktok_user_id || `anon:${kolNameOf(s)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(s);
      });

      const btn = (u, label='View') =>
        u ? `<a class="btn btn-sm btn-outline-secondary" href="${u}" target="_blank" rel="noopener">${label}</a>` : '<span class="text-muted">—</span>';

      const rowsHtml = [];
      let rowIndex = (res.current_page - 1) * (res.per_page || 20);

      for (const [openId, subs] of groups.entries()) {
        const first = subs[0] || {};
        const displayName = kolNameOf(first);
        const avatar = first.profile_pic_url ? `<img src="${first.profile_pic_url}" alt="" style="width:28px;height:28px;border-radius:50%;object-fit:cover">` : '';

        // Ambil satu submission id untuk aksi (by design: max 1 submission per campaign & KOL)
        const firstSubmissionId = first.id;

        // Header per KOL — kiri: nama (tanpa open_id), kanan: tombol aksi
        rowsHtml.push(`
          <tr class="table-active">
            <td colspan="12">
              <div class="d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center gap-2">
                  ${avatar}
                  <span class="fw-semibold">${displayName}</span>
                </div>
                <div class="d-flex flex-wrap gap-2">
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
          rowIndex += 1;

          const s1url = s.screenshot_1_url || toUrl(s.screenshot_1_path);
          const s2url = s.screenshot_2_url || toUrl(s.screenshot_2_path);
          const invUrl = s.invoice_file_url || toUrl(s.invoice_file_path);
          const revUrl = s.review_proof_file_url || toUrl(s.review_proof_file_path);

          const slotRow = (slot) => {
            const is1 = slot === 1;
            const link = is1 ? (s.link_1 || '') : (s.link_2 || '');
            const pdate = is1 ? s.post_date_1 : s.post_date_2;
            const scUrl = is1 ? s1url : s2url;

            const views    = metric(s, slot, 'views')    ?? metric(s, slot, 'view');
            const likes    = metric(s, slot, 'likes')    ?? metric(s, slot, 'like');
            const comments = metric(s, slot, 'comments') ?? metric(s, slot, 'comment');
            const shares   = metric(s, slot, 'shares')   ?? metric(s, slot, 'share');

            if (!link && !pdate && !scUrl) return '';

            // Tidak ada tombol aksi di baris konten; semua aksi dipindah ke header per KOL
            return `
              <tr ${is1 ? `data-submission-id="${s.id}"` : ''}>
                <td colspan="2">Content ${slot}</td>
                <td>${link ? `<a href="${link}" target="_blank" rel="noopener">${link}</a>` : '<span class="text-muted">—</span>'}</td>
                <td>${fmtDate(pdate)}</td>
                <td>${btn(scUrl, 'View')}</td>
                <td>${btn(invUrl, 'Invoice')}</td>
                <td>${btn(revUrl, 'Review')}</td>
                <td class="text-end">${fmtNum(views)}</td>
                <td class="text-end">${fmtNum(likes)}</td>
                <td class="text-end">${fmtNum(comments)}</td>
                <td class="text-end">${fmtNum(shares)}</td>
                <td></td>
              </tr>
            `;
          };

          rowsHtml.push(slotRow(1));
          rowsHtml.push(slotRow(2));
        });
      }

      const tableHtml = `
        <table class="table table-bordered bg-white">
          <thead>
            <tr><th colspan="12" class="text-uppercase">Submissions</th></tr>
            <tr>
              <th style="width:140px" colspan="2">Content</th>
              <th style="min-width:260px">Link</th>
              <th style="width:120px">Tanggal</th>
              <th style="width:120px">Screenshot</th>
              <th style="width:120px">Invoice</th>
              <th style="width:120px">Review</th>
              <th style="width:100px" class="text-end">Views</th>
              <th style="width:100px" class="text-end">Likes</th>
              <th style="width:110px" class="text-end">Comments</th>
              <th style="width:100px" class="text-end">Shares</th>
              <th style="width:160px">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml.filter(Boolean).join('') || `
              <tr><td colspan="12" class="text-center text-muted">Tidak ada data.</td></tr>
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

    // refresh per submission (tombol ada di baris header per KOL)
    document.querySelectorAll('.btn-refresh-metrics').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-id');
        const old = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Refresh`;

        try {
          const resp = await submissionService.refreshMetrics(id);
          showToast(resp.message || 'Metrik berhasil di-refresh.');
          await loadSubmissions(currentPage);
        } catch (err) {
          if ((err?.status === 401 || err?.status === 409) && err?.reauth_url) {
            showToast(err.message || 'Token TikTok tidak valid. Silakan connect ulang.', 'error');
          } else {
            showToast(err?.message || 'Gagal refresh metrik', 'error');
          }
        } finally {
          btn.disabled = false;
          btn.innerHTML = old;
        }
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

  // Events
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

  // initial load
  if (campaignFilter.value) {
    currentCampaignId = campaignFilter.value;
    loadSubmissions(currentPage);
  } else {
    hideLoader();
  }
}
