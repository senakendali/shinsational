import { renderHeader } from '../../components/header.js';
import { renderBreadcrumb } from '../../components/breadcrumb.js';
import { showLoader, hideLoader } from '../../components/loader.js';
import { showToast } from '../../utils/toast.js';

import { campaignService } from '../../services/campaignService.js';
import { submissionService } from '../../services/influencerSubmissionService.js';

export async function render(target, path, query = {}, labelOverride = null) {
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
      <div class="text-muted small">
        <span class="me-2">Tips: klik “View” untuk buka file</span>
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

  // Helpers
  const toUrl = (p) => {
    if (!p) return null;
    if (/^https?:\/\//i.test(p)) return p;
    return `/storage/${String(p).replace(/^\/?storage\/?/, '')}`;
  };
  const fmtDate = (s) => (s ? new Date(s).toLocaleDateString('id-ID') : '—');
  const fmtNum  = (n) => (n === 0 || n ? Number(n).toLocaleString('id-ID') : '—');

  // ambil nama tampil KOL dari field yang mungkin ada
  const kolNameOf = (s) => {
    return (
      s.kol_name ||
      s.full_name ||
      s.display_name ||
      s.tiktok_display_name ||
      (s.tiktok_username ? `@${s.tiktok_username}` : null) ||
      s.name ||
      s.creator_name ||
      s.influencer_name ||
      s.user_name ||
      s.tiktok_user_id || '—'
    );
  };

  // ambil metric per slot kalau tersedia; fallback total
  const metric = (s, slot, base) => {
    const keys = [
      `${base}_${slot}`,          // views_1
      `${base}${slot}`,           // views1
      `${base}_${slot}_count`,    // view_1_count
      `${base}${slot}_count`,     // view1_count
      base,                       // views
      `${base}_count`,            // views_count
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
    // auto select dari query ?campaign_id=...
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

      // Filter keyword sederhana (nama, open_id, link)
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

      // Grouping per open_id (fallback ke nama kalau open_id kosong)
      const groups = new Map();
      filtered.forEach((s) => {
        const key = s.tiktok_user_id || `anon:${kolNameOf(s)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(s);
      });

      // Builder button
      const btn = (u, label='View') =>
        u ? `<a class="btn btn-sm btn-outline-secondary" href="${u}" target="_blank" rel="noopener">${label}</a>` : '<span class="text-muted">—</span>';

      // Build table body: group header (nama) + 2 baris (slot 1 & 2) per submission
      const rowsHtml = [];
      let rowIndex = (res.current_page - 1) * (res.per_page || 20);

      for (const [openId, subs] of groups.entries()) {
        // Pakai nama dari submission pertama di grup
        const first = subs[0] || {};
        const displayName = kolNameOf(first);

        // Separator/heading per KOL
        rowsHtml.push(`
          <tr class="table-active">
            <td colspan="12">
              <div class="d-flex justify-content-between align-items-center">
                <div class="fw-semibold">${displayName}</div>
                <div class="small text-muted">${openId !== displayName ? openId : ''}</div>
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

            // Metrics per-slot (fallback ke total)
            const views   = metric(s, slot, 'views')   ?? metric(s, slot, 'view');
            const likes   = metric(s, slot, 'likes')   ?? metric(s, slot, 'like');
            const comments= metric(s, slot, 'comments')?? metric(s, slot, 'comment');
            const shares  = metric(s, slot, 'shares')  ?? metric(s, slot, 'share');

            // Jika row kosong total (tak ada link/tanggal/screenshot), skip
            if (!link && !pdate && !scUrl) return '';

            return `
              <tr>
                <td>${rowIndex}${slot === 2 ? '<small class="text-muted">.2</small>' : ''}</td>
                <td>Slot ${slot}</td>
                <td>${link ? `<a href="${link}" target="_blank" rel="noopener">${link}</a>` : '<span class="text-muted">—</span>'}</td>
                <td>${fmtDate(pdate)}</td>
                <td>${btn(scUrl, 'View')}</td>
                <td>${btn(invUrl, 'Invoice')}</td>
                <td>${btn(revUrl, 'Review')}</td>
                <td class="text-end">${fmtNum(views)}</td>
                <td class="text-end">${fmtNum(likes)}</td>
                <td class="text-end">${fmtNum(comments)}</td>
                <td class="text-end">${fmtNum(shares)}</td>
                <td>
                  <button class="btn btn-sm btn-outline-primary app-link" data-href="/admin/submissions/${s.id}/edit">
                    <i class="bi bi-pencil"></i> Edit
                  </button>
                </td>
              </tr>
            `;
          };

          // Maks. 2 baris per submission (slot 1 & 2)
          rowsHtml.push(slotRow(1));
          rowsHtml.push(slotRow(2));
        });
      }

      const tableHtml = `
        <table class="table table-bordered bg-white">
          <thead>
            <tr><th colspan="12" class="text-uppercase">Submissions</th></tr>
            <tr>
              <th style="width:60px">#</th>
              <th style="width:80px">Slot</th>
              <th style="min-width:260px">Link</th>
              <th style="width:120px">Tanggal</th>
              <th style="width:120px">Screenshot</th>
              <th style="width:120px">Invoice</th>
              <th style="width:120px">Review Proof</th>
              <th style="width:100px" class="text-end">Views</th>
              <th style="width:100px" class="text-end">Likes</th>
              <th style="width:110px" class="text-end">Comments</th>
              <th style="width:100px" class="text-end">Shares</th>
              <th style="width:120px">Aksi</th>
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

      // app-link navigation
      document.querySelectorAll('.app-link').forEach(el => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          const href = el.getAttribute('data-href');
          if (!href) return;
          history.pushState(null, '', href);
          window.dispatchEvent(new PopStateEvent('popstate'));
        });
      });

    } catch (err) {
      console.error(err);
      listWrap.innerHTML = `<div class="text-danger">Gagal memuat submissions.</div>`;
    } finally {
      hideLoader();
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
