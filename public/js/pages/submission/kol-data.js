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
      "contact_phone",
      "phone",
      "phone_number",
      "whatsapp",
      "wa",
      "mobile",
      "telp",
      "no_hp",
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
    const pick = (...keys) =>
      keys.map((k) => s?.[k]).find((v) => v && String(v).trim() !== "");
    const full =
      pick("full_address", "address", "alamat", "shipping_address") ||
      [
        pick("address_line_1", "alamat_1"),
        pick("address_line_2", "alamat_2"),
        pick("city", "kota"),
        pick("state", "province", "provinsi"),
        pick("postal_code", "zip"),
      ]
        .filter(Boolean)
        .join(", ");
    return (full && String(full).trim()) || "";
  };

  const genderOf = (s = {}) => {
    const raw =
      s.gender ||
      s.kol_gender ||
      s.user_gender ||
      s.influencer_gender ||
      s.sex ||
      "";
    const val = String(raw || "").trim().toLowerCase();
    if (!val) return "Unknown";
    if (["male", "m", "pria", "laki-laki", "l"].includes(val)) return "Male";
    if (["female", "f", "wanita", "perempuan", "p"].includes(val)) return "Female";
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
    const dob =
      s.birth_date ||
      s.birthdate ||
      s.date_of_birth ||
      s.dob ||
      s.kol_birth_date ||
      s.influencer_birth_date ||
      null;
    const calc = ageFrom(dob);
    return calc ?? "—";
  };

  function getCsrfToken() {
    const m = document.querySelector('meta[name="csrf-token"]');
    if (m?.content) return m.content;
    const xsrf = document.cookie
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("XSRF-TOKEN="));
    if (!xsrf) return "";
    try {
      return decodeURIComponent(xsrf.split("=")[1]);
    } catch {
      return "";
    }
  }
  async function fetchWithCsrf(input, init = {}) {
    const headers = new Headers(init.headers || {});
    headers.set("X-Requested-With", "XMLHttpRequest");
    const token = getCsrfToken();
    if (token) headers.set("X-CSRF-TOKEN", token);
    return fetch(input, { ...init, headers, credentials: "same-origin" });
  }

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

  // ====== state untuk export ======
  let lastRows = [];          // array hasil unique + filter (yang tampil)
  let lastCampaignName = "";  // nama campaign aktif

  // ---------- populate campaign filter ----------
  try {
    const data = await campaignService.getAll({
      page: 1,
      per_page: 100,
      status: "",
    });
    const items = data?.data || [];
    campaignFilter.innerHTML =
      `<option value="">— Select Campaign —</option>` +
      items.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    const preset =
      query?.campaign_id ||
      new URL(location.href).searchParams.get("campaign_id");
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
    const res = await submissionService.getAll({
      page,
      per_page,
      include: "campaign",
      campaign_id,
    });
    return res;
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
      const res = await fetchSubmissions({
        page,
        per_page: 20,
        campaign_id: currentCampaignId,
      });

      // simpan nama campaign untuk export filename
      lastCampaignName =
        res?.data?.[0]?.campaign?.name ||
        (campaignFilter.selectedOptions[0]?.textContent || "").trim() ||
        "";

      // unique by tiktok_user_id (keep latest)
      const arrRaw = res?.data || [];
      const byOpenId = new Map();
      for (const s of arrRaw) {
        const key = s.tiktok_user_id || `anon:${kolNameOf(s)}`;
        const prev = byOpenId.get(key);
        if (!prev) {
          byOpenId.set(key, s);
          continue;
        }
        const tA = new Date(s.updated_at || s.created_at || 0).getTime();
        const tB = new Date(prev.updated_at || prev.created_at || 0).getTime();
        if (tA >= tB) byOpenId.set(key, s);
      }
      let rows = Array.from(byOpenId.values());

      // Keyword filter
      const kw = (currentKeyword || "").toLowerCase().trim();
      if (kw) {
        rows = rows.filter((s) => {
          const name = kolNameOf(s);
          const uname = tiktokUsernameOf(s);
          const phone = phoneOf(s);
          const email = emailOf(s);
          const addr = addressOf(s);
          const openId = s.tiktok_user_id || "";
          const hay = [name, uname, phone, email, addr, openId]
            .join(" ")
            .toLowerCase();
          return hay.includes(kw);
        });
      }

      // Gender filter
      const gf = (currentGender || "").trim();
      if (gf) {
        rows = rows.filter((s) => genderOf(s) === gf);
      }

      // simpan untuk export
      lastRows = rows.slice();

      // Build table
      const body = rows
        .map((s) => {
          const name = kolNameOf(s);
          const uname = tiktokUsernameOf(s);
          const phone = safe(phoneOf(s), "—");
          const email = safe(emailOf(s), "—");
          const addr = safe(addressOf(s), "—");
          const gender = genderOf(s);
          const age = ageOf(s);

          return `
            <tr>
              <td style="min-width:240px">
                <div class="fw-semibold">${name}</div>
                <div class="small text-muted">${uname}</div>
              </td>
              <td style="min-width:140px">${phone || "—"}</td>
              <td style="min-width:220px">${email || "—"}</td>
              <td style="min-width:320px">${addr || "—"}</td>
              <td style="width:120px">${gender}</td>
              <td style="width:100px" class="text-center">${age ?? "—"}</td>
            </tr>
          `;
        })
        .join("");

      const table = `
        <div class="table-responsive">
          <table class="table table-bordered bg-white align-middle">
            <thead class="table-light">
              <tr>
                <th style="min-width:240px">KOL</th>
                <th style="min-width:140px">Phone</th>
                <th style="min-width:220px">Email</th>
                <th style="min-width:320px">Address</th>
                <th style="width:120px">Gender</th>
                <th style="width:100px" class="text-center">Age</th>
              </tr>
            </thead>
            <tbody>
              ${
                body ||
                `<tr><td colspan="6" class="text-center text-muted">No data.</td></tr>`
              }
            </tbody>
          </table>
        </div>
      `;
      listWrap.innerHTML = table;

      // Pagination (server paginator)
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
    if (!campaignId) {
        showToast('Pilih campaign dulu ya.', 'error');
        return;
    }
    const q = (searchInput.value || '').trim();
    const gender = (genderFilter.value || '').trim(); // '', Male, Female, Other, Unknown

    const qs = new URLSearchParams({ campaign_id: campaignId });
    if (q) qs.set('q', q);
    if (gender) qs.set('gender', gender);

    const url = `/api/influencer-submissions/kols/export?${qs.toString()}`;
    window.open(url, '_blank'); // trigger download
    }

  // ===== Export helper (client-side CSV) =====
  function exportVisibleToCSV() {
    if (!lastRows.length) {
      showToast("Tidak ada data untuk diekspor.", "error");
      return;
    }

    const header = [
      "Campaign",
      "KOL Name",
      "TikTok Username",
      "TikTok User ID",
      "Phone",
      "Email",
      "Address",
      "Gender",
      "Age",
    ];

    const rows = lastRows.map((s) => {
      const name = kolNameOf(s);
      const uname = tiktokUsernameOf(s);
      const openId = s.tiktok_user_id || "";
      const phone = phoneOf(s) || "";
      const email = emailOf(s) || "";
      const addr = addressOf(s) || "";
      const gender = genderOf(s) || "";
      const age = ageOf(s);
      return [
        lastCampaignName || "",
        name,
        uname,
        openId,
        phone,
        email,
        addr,
        gender,
        age == null ? "" : String(age),
      ];
    });

    const toCSV = (arr) =>
      arr
        .map((r) =>
          r
            .map((c) => {
              const val = c == null ? "" : String(c);
              return /[",\n]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;
            })
            .join(",")
        )
        .join("\n");

    const csv = "\uFEFF" + toCSV([header, ...rows]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const cleanName = (lastCampaignName || "kol_data").replace(/[^\w\-]+/g, "_");
    const fileName = `kol_${cleanName}_${y}${m}${d}_${hh}${mm}.csv`;

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();

    showToast("Export selesai. File siap diunduh.");
  }

  // ---------- top controls ----------
  campaignFilter.addEventListener("change", () => {
    currentCampaignId = campaignFilter.value || "";
    currentPage = 1;
    loadKols(currentPage);
  });

  genderFilter.addEventListener("change", () => {
    currentGender = genderFilter.value || "";
    currentPage = 1;
    loadKols(currentPage);
  });

  searchInput.addEventListener("input", (e) => {
    currentKeyword = e.target.value;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      currentPage = 1;
      loadKols(currentPage);
    }, 250);
  });

  refreshBtn?.addEventListener("click", () => loadKols(currentPage));
  exportBtn?.addEventListener("click", doServerExport);

  // ---------- init ----------
  if (campaignFilter.value) {
    currentCampaignId = campaignFilter.value;
    loadKols(currentPage);
  } else {
    hideLoader();
  }
}
