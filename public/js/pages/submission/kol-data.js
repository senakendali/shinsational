// /js/pages/submission/kol-data.js
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

  // optional: influencerAccountService (buat cek koneksi TikTok & followers fallback)
  let accountServiceMod = null;
  try {
    accountServiceMod = await import(`../../services/influencerAccountService.js?v=${v}`);
  } catch {}

  const influencerAccountService = accountServiceMod?.influencerAccountService || {
    async getAll(params = {}) {
      const qs = new URLSearchParams();
      if (params.page) qs.set('page', params.page);
      if (params.per_page) qs.set('per_page', params.per_page);
      if (params.q) qs.set('q', params.q);
      const url = `/api/influencer-accounts?${qs.toString()}`;
      const r = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      if (!r.ok) throw await r.json().catch(() => new Error('Failed to load influencer accounts'));
      return r.json();
    }
  };

  const { renderHeader } = headerMod;
  const { renderBreadcrumb } = breadcrumbMod;
  const { showLoader, hideLoader } = loaderMod;
  const { showToast } = toastMod;
  const { campaignService } = campaignMod;
  const { submissionService } = submissionMod;

  // ---------- helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const safe = (v, d = "") => (v == null ? d : v);

  const kolNameOf = (s = {}) =>
    s.full_name ||
    (s.tiktok_username ? `@${s.tiktok_username}` : null) ||
    s.display_name ||
    s.tiktok_display_name ||
    s.name ||
    s.creator_name ||
    s.influencer_name ||
    s.user_name ||
    "—";

  const tiktokUsernameOf = (s = {}) =>
    s.tiktok_username ? `@${s.tiktok_username}` : "—";

  const phoneOf = (s = {}) => {
    const k = [
      "contact_phone","phone","phone_number","whatsapp","wa","mobile","telp","no_hp",
    ];
    for (const key of k) if (s[key]) return s[key];
    return "";
  };

  const emailOf = (s = {}) => {
    const k = ["contact_email", "email", "kol_email"];
    for (const key of k) if (s[key]) return s[key];
    return "";
  };

  const addressOf = (s = {}) => {
    const pick = (...keys) => keys.map((k) => s?.[k]).find((v) => v && String(v).trim() !== "");
    const full =
      pick("full_address", "address", "alamat", "shipping_address") ||
      [ pick("address_line_1", "alamat_1"), pick("address_line_2", "alamat_2"), pick("city", "kota"), pick("state", "province", "provinsi"), pick("postal_code", "zip") ]
        .filter(Boolean).join(", ");
    return (full && String(full).trim()) || "";
  };

  const genderOf = (s = {}) => {
    const raw = s.gender || s.kol_gender || s.user_gender || s.influencer_gender || s.sex || "";
    const val = String(raw || "").trim().toLowerCase();
    if (!val) return "Unknown";
    if (["male","m","pria","laki-laki","l"].includes(val)) return "Male";
    if (["female","f","wanita","perempuan","p"].includes(val)) return "Female";
    return "Other";
  };

  const ageFrom = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age >= 0 && age < 150 ? age : null;
  };

  const ageOf = (s = {}) => {
    const ageFields = ["age", "kol_age", "influencer_age"];
    for (const k of ageFields) {
      const v = s[k];
      if (v != null && v !== "") {
        const n = Number(v);
        if (!Number.isNaN(n) && n > 0 && n < 150) return n;
      }
    }
    const dob = s.birth_date || s.birthdate || s.date_of_birth || s.dob || s.kol_birth_date || s.influencer_birth_date || null;
    const calc = ageFrom(dob);
    return calc ?? "—";
  };

  // ---------- mount skeleton ----------
  showLoader();
  target.innerHTML = "";

  renderHeader("header");
  renderBreadcrumb(target, path, labelOverride ?? "KOL Data");

  target.innerHTML += `
    <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <select id="campaignFilter" class="form-select" style="min-width:220px">
          <option value="">— Select Campaign —</option>
        </select>
        <select id="genderFilter" class="form-select" style="min-width:160px">
          <option value="">All Genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
          <option value="Unknown">Unknown</option>
        </select>
        <input class="form-control" style="min-width:280px" type="search" placeholder="Search name/username/phone/email/address…" id="searchInput">
      </div>
      <div class="d-flex align-items-center gap-2 flex-wrap">
        <a class="btn btn-primary app-link" data-href="/admin/kols/create">
          <i class="bi bi-plus-lg"></i> Tambah KOL
        </a>
        <button class="btn btn-outline-secondary btn-refresh" type="button">
          <i class="bi bi-arrow-clockwise"></i> Refresh
        </button>
        <button class="btn btn-success btn-export-excel" type="button">
          <i class="bi bi-file-earmark-excel"></i> Export Excel
        </button>
      </div>
    </div>

    <div id="kol-list"></div>

    <nav class="mt-3">
      <ul class="pagination" id="pagination"></ul>
    </nav>
  `;

  const campaignFilter = $("#campaignFilter");
  const genderFilter = $("#genderFilter");
  const searchInput = $("#searchInput");
  const listWrap = $("#kol-list");
  const pager = $("#pagination");
  const refreshBtn = $(".btn-refresh");
  const exportBtn = $(".btn-export-excel");

  // ====== Global handler .app-link (Tambah KOL tetap bisa tanpa campaign)
  if (!window.__KOL_DATA_APP_LINK_BOUND__) {
    window.__KOL_DATA_APP_LINK_BOUND__ = true;
    document.addEventListener('click', (e) => {
      const a = e.target.closest('.app-link');
      if (!a) return;
      const href = a.getAttribute('data-href') || a.getAttribute('href');
      if (!href) return;
      e.preventDefault();
      history.pushState(null, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  }

  // ====== state export ======
  let lastRows = [];          // [{ sub, acc, connection, followers }]
  let lastCampaignName = "";  // nama campaign aktif

  // ---------- populate campaign filter ----------
  try {
    const data = await campaignService.getAll({ page: 1, per_page: 100, status: "" });
    const items = data?.data || [];
    campaignFilter.innerHTML =
      `<option value="">— Select Campaign —</option>` +
      items.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    const preset = query?.campaign_id || new URL(location.href).searchParams.get("campaign_id");
    if (preset && campaignFilter.querySelector(`option[value="${preset}"]`)) {
      campaignFilter.value = preset;
    }
  } catch {}

  // ---------- state ----------
  let currentPage = 1;
  let currentCampaignId = campaignFilter.value || "";
  let currentGender = genderFilter.value || "";
  let currentKeyword = "";
  let debounce = null;

  // ---------- API ----------
  async function fetchSubmissions({ page = 1, per_page = 20, campaign_id }) {
    const res = await submissionService.getAll({ page, per_page, include: "campaign", campaign_id });
    return res;
  }

  async function fetchAccountsMap() {
    try {
      const accRes = await influencerAccountService.getAll({ page: 1, per_page: 1000 });
      const arr = accRes?.data || accRes?.items || accRes || [];
      const map = new Map();
      for (const a of arr) if (a?.tiktok_user_id) map.set(a.tiktok_user_id, a);
      return map;
    } catch { return new Map(); }
  }

  // ---------- loader ----------
  async function loadKols(page = 1) {
    currentCampaignId = campaignFilter.value || "";
    if (!currentCampaignId) {
      listWrap.innerHTML = `<div class="alert alert-info">Please select a <b>Campaign</b> first.</div>`;
      pager.innerHTML = "";
      hideLoader();
      lastRows = [];
      lastCampaignName = "";
      return;
    }

    showLoader();
    try {
      const res = await fetchSubmissions({ page, per_page: 20, campaign_id: currentCampaignId });

      lastCampaignName =
        res?.data?.[0]?.campaign?.name ||
        (campaignFilter.selectedOptions[0]?.textContent || "").trim() || "";

      // unique by open_id (terbaru)
      const arrRaw = res?.data || [];
      const byOpenId = new Map();
      for (const s of arrRaw) {
        const key = s.tiktok_user_id || `anon:${kolNameOf(s)}`;
        const prev = byOpenId.get(key);
        if (!prev) { byOpenId.set(key, s); continue; }
        const tA = new Date(s.updated_at || s.created_at || 0).getTime();
        const tB = new Date(prev.updated_at || prev.created_at || 0).getTime();
        if (tA >= tB) byOpenId.set(key, s);
      }
      let rows = Array.from(byOpenId.values());

      const accMap = await fetchAccountsMap();

      // keyword
      const kw = (currentKeyword || "").toLowerCase().trim();
      if (kw) {
        rows = rows.filter((s) => {
          const name = kolNameOf(s);
          const uname = tiktokUsernameOf(s);
          const phone = phoneOf(s);
          const email = emailOf(s);
          const addr = addressOf(s);
          const openId = s.tiktok_user_id || "";
          const hay = [name, uname, phone, email, addr, openId].join(" ").toLowerCase();
          return hay.includes(kw);
        });
      }

      // gender
      const gf = (currentGender || "").trim();
      if (gf) rows = rows.filter((s) => genderOf(s) === gf);

      const joined = rows.map((s) => {
        const acc = s?.tiktok_user_id ? accMap.get(s.tiktok_user_id) : null;
        const connected = !!acc;
        const followers =
          (s.followers_count != null ? Number(s.followers_count) : null) ??
          (acc?.followers_count != null ? Number(acc.followers_count) : null);
        return {
          sub: s,
          acc,
          connection: connected ? 'Connected' : 'Not connected',
          followers: Number.isFinite(followers) ? followers : '—',
        };
      });

      lastRows = joined.slice();

      const body = joined.map(({ sub: s, acc, connection, followers }) => {
        const name = kolNameOf(s);
        const uname = tiktokUsernameOf(s);
        const phone = safe(phoneOf(s), "—");
        const email = safe(emailOf(s), "—");
        const addr = safe(addressOf(s), "—");
        const gender = genderOf(s);
        const age = ageOf(s);

        // gunakan registration_id langsung
        const regId = s.registration_id || '';
        const disabled = regId ? '' : 'disabled';

        return `
          <tr>
            <td style="min-width:240px">
              <div class="fw-semibold">${name}</div>
              <div class="small text-muted">${uname}</div>
            </td>
            <td style="width:140px" class="text-center">${connection}</td>
            <td style="width:140px" class="text-end">${followers === '—' ? '—' : followers.toLocaleString('id-ID')}</td>
            <td style="min-width:140px">${phone || "—"}</td>
            <td style="min-width:220px">${email || "—"}</td>
            <td style="min-width:320px">${addr || "—"}</td>
            <td style="width:120px">${gender}</td>
            <td style="width:100px" class="text-center">${age ?? "—"}</td>
            <td style="min-width:220px">
              <div class="d-flex gap-2 flex-wrap">
                <button class="btn btn-sm btn-outline-primary"
                        data-reg-id="${regId}"
                        onclick="editKol(this)" ${disabled}>
                  <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-sm btn-outline-danger"
                        data-reg-id="${regId}"
                        data-name="${name}"
                        onclick="confirmDeleteKol(this)" ${disabled}>
                  <i class="bi bi-trash"></i> Delete
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join("");

      listWrap.innerHTML = `
        <div class="table-responsive">
          <table class="table table-bordered bg-white align-middle">
            <thead class="table-light">
              <tr>
                <th style="min-width:240px">KOL</th>
                <th style="width:140px" class="text-center">Status Koneksi</th>
                <th style="width:140px" class="text-end">Followers</th>
                <th style="min-width:140px">Phone</th>
                <th style="min-width:220px">Email</th>
                <th style="min-width:320px">Address</th>
                <th style="width:120px">Gender</th>
                <th style="width:100px" class="text-center">Age</th>
                <th style="min-width:220px">Aksi</th>
              </tr>
            </thead>
            <tbody>${ body || `<tr><td colspan="9" class="text-center text-muted">No data.</td></tr>` }</tbody>
          </table>
        </div>
      `;

      // Pagination
      pager.innerHTML = "";
      if (res?.last_page > 1) {
        for (let i = 1; i <= res.last_page; i++) {
          const li = document.createElement("li");
          li.className = `page-item ${i === res.current_page ? "active" : ""}`;
          li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
          li.addEventListener("click", (e) => {
            e.preventDefault();
            currentPage = i;
            loadKols(currentPage);
          });
          pager.appendChild(li);
        }
      }

    } catch (err) {
      console.error(err);
      listWrap.innerHTML = `<div class="text-danger">Failed to load KOL data.</div>`;
      pager.innerHTML = "";
      lastRows = [];
    } finally {
      hideLoader();
    }
  }

  function doServerExport() {
    const campaignId = (campaignFilter.value || '').trim();
    if (!campaignId) { showToast('Pilih campaign dulu ya.', 'error'); return; }
    const q = (searchInput.value || '').trim();
    const gender = (genderFilter.value || '').trim();
    const qs = new URLSearchParams({ campaign_id: campaignId });
    if (q) qs.set('q', q);
    if (gender) qs.set('gender', gender);
    window.open(`/api/influencer-submissions/kols/export?${qs.toString()}`, '_blank');
  }

  // ---------- top controls ----------
  campaignFilter.addEventListener("change", () => { currentCampaignId = campaignFilter.value || ""; currentPage = 1; loadKols(currentPage); });
  genderFilter.addEventListener("change", () => { currentGender = genderFilter.value || ""; currentPage = 1; loadKols(currentPage); });
  searchInput.addEventListener("input", (e) => {
    currentKeyword = e.target.value;
    clearTimeout(debounce);
    debounce = setTimeout(() => { currentPage = 1; loadKols(currentPage); }, 250);
  });
  refreshBtn?.addEventListener("click", () => loadKols(currentPage));
  exportBtn?.addEventListener("click", doServerExport);

  // ---------- init ----------
  if (campaignFilter.value) { currentCampaignId = campaignFilter.value; loadKols(currentPage); } else { hideLoader(); }
}

/* ====== Global: EDIT KOL — langsung pakai registration_id ====== */
window.editKol = async function (btn) {
  const id = btn.getAttribute('data-reg-id');
  const v = window.BUILD_VERSION || Date.now();
  const { showToast } = await import(`../../utils/toast.js?v=${v}`);

  if (!id) return showToast('Registration ID tidak ditemukan.', 'error');

  history.pushState(null, '', `/admin/kols/${id}/edit`);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

/* ====== Global: DELETE KOL — langsung DELETE by registration_id ====== */
window.confirmDeleteKol = async function (btn) {
  const id = btn.getAttribute('data-reg-id');
  const name = btn.getAttribute('data-name') || 'KOL';
  const v = window.BUILD_VERSION || Date.now();
  const { showToast } = await import(`../../utils/toast.js?v=${v}`);

  if (!id) return showToast('Registration ID tidak ditemukan.', 'error');

  // Siapkan modal (sekali buat)
  let modalEl = document.getElementById('deleteKolModal');
  if (!modalEl) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="modal fade" id="deleteKolModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Konfirmasi Hapus</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <p id="delete-kol-message">Yakin ingin menghapus data ini?</p>
              <div class="text-muted small">Penghapusan akan menghapus data registrasi KOL untuk campaign terkait.</div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
              <button type="button" class="btn btn-danger" id="confirmDeleteKolBtn">Hapus</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrapper);
    modalEl = document.getElementById('deleteKolModal');
  }

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modalEl.querySelector('#delete-kol-message').textContent = `Yakin ingin menghapus "${name}"?`;
  modal.show();

  const confirmBtn = document.getElementById('confirmDeleteKolBtn');
  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true;
    try {
      const { influencerService } = await import(`../../services/influencerRegistrationService.js?v=${v}`);
      await influencerService.delete(id);
      showToast('KOL berhasil dihapus.');
      modal.hide();

      // Refresh halaman sekarang (trigger router re-render)
      history.replaceState(null, '', location.pathname + location.search);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      showToast(err?.message || 'Gagal menghapus KOL.', 'error');
    } finally {
      confirmBtn.disabled = false;
    }
  };
};
