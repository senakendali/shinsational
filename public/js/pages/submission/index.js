// /js/pages/admin/submissions-list.js
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

  showLoader();
  target.innerHTML = "";

  renderHeader("header");
  renderBreadcrumb(target, path, labelOverride);

  // ---- main skeleton
  target.innerHTML += `
    <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <select id="campaignFilter" class="form-select" style="min-width:260px">
          <option value="">— Pilih Campaign —</option>
        </select>
        <input class="form-control" style="min-width:260px" type="search" placeholder="Cari KOL / link…" id="searchInput">
      </div>
      <div class="d-flex align-items-center gap-2 flex-wrap">
        <button class="btn btn-outline-secondary btn-refresh-all" type="button">
          <i class="bi bi-arrow-clockwise"></i> Refresh visible
        </button>
        <button class="btn btn-success btn-export-excel" type="button">
          <i class="bi bi-file-earmark-excel"></i> Export Excel
        </button>
      </div>
    </div>

    <div id="submission-list"></div>

    <nav class="mt-3">
      <ul class="pagination" id="pagination"></ul>
    </nav>
  `;

  // ---- lightweight "Input Resi" modal (once)
  if (!document.getElementById("resiModal")) {
    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <div id="resiModal" class="position-fixed top-0 start-0 w-100 h-100 d-none"
           style="background:rgba(0,0,0,.35); z-index:2000;">
        <div class="bg-white rounded shadow p-3"
             style="max-width:520px; width:92%; margin:10vh auto;">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0">Input Nomor Resi</h6>
            <button type="button" class="btn-close btn-close-resi" aria-label="Close"></button>
          </div>
          <div class="mb-3">
            <label for="resi_courier" class="form-label text-muted">Nama Ekspedisi</label>
            <input type="text" id="resi_courier" class="form-control" placeholder="JNE / J&T / SiCepat / ...">
          </div>
          <div class="mb-3">
            <label for="resi_tracking" class="form-label text-muted">Nomor Resi</label>
            <input type="text" id="resi_tracking" class="form-control" placeholder="XXXXXXXXXXXX">
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary btn-cancel-resi">Batal</button>
            <button type="button" class="btn btn-primary btn-save-resi">
              <i class="bi bi-save"></i> Simpan
            </button>
          </div>
          <input type="hidden" id="resi_submission_id">
        </div>
      </div>
    `
    );
  }

  const $ = (sel) => document.querySelector(sel);
  const campaignFilter = $("#campaignFilter");
  const searchInput = $("#searchInput");
  const listWrap = $("#submission-list");
  const pager = $("#pagination");
  const refreshAllBtn = $(".btn-refresh-all");
  const exportBtn = $(".btn-export-excel");

  // ===== Export state (diisi saat loadSubmissions) =====
  let lastFiltered = [];     // array submissions (hasil filter keyword)
  let lastCampaignName = ""; // nama campaign untuk nama file export

  // ===== Helpers =====
  const toFileUrl = (input) => {
    if (!input) return null;
    const origin = location.origin;
    let raw = String(input).trim();
    if (/^https?:\/\//i.test(raw)) {
      try {
        const u = new URL(raw);
        if (u.origin === origin && /^\/?storage\//i.test(u.pathname)) {
          const stripped = u.pathname.replace(/^\/?storage\/?/i, "");
          return `${origin}/files?p=${encodeURIComponent(stripped)}`;
        }
        return raw;
      } catch {}
    }
    const normalized = raw.replace(/^\/+/, "").replace(/^storage\/+/i, "");
    return `${origin}/files?p=${encodeURIComponent(normalized)}`;
  };

  const fmtDate = (s) => (s ? new Date(s).toLocaleDateString("id-ID") : "—");
  const fmtNum = (n) => (n === 0 || n ? Number(n).toLocaleString("id-ID") : "—");

  const kolNameOf = (s) =>
    s.full_name ||
    (s.tiktok_username ? `@${s.tiktok_username}` : null) ||
    s.display_name ||
    s.tiktok_display_name ||
    s.name ||
    s.creator_name ||
    s.influencer_name ||
    s.user_name ||
    "—";

  const kolAvatarOf = (s) =>
    s.avatar_url ||
    s.profile_pic_url ||
    s.tiktok_avatar_url ||
    s.influencer_avatar_url ||
    s.photo_url ||
    null;

  const addressOf = (s) => {
    const pick = (...keys) => keys.map((k) => s?.[k]).find((v) => v && String(v).trim() !== "");
    const full =
      pick("full_address", "address", "alamat", "shipping_address") ||
      [
        pick("address_line_1", "alamat_1"),
        pick("address_line_2", "alamat_2"),
        pick("city", "kota"),
        pick("state", "province", "provinsi"),
        pick("postal_code", "zip"),
      ].filter(Boolean).join(", ");
    return (full && String(full).trim()) || "";
  };

  const metric = (s, slot, base) => {
    const keys = [
      `${base}_${slot}`, `${base}${slot}`,
      `${base}_${slot}_count`, `${base}${slot}_count`,
      base, `${base}_count`,
    ];
    for (const k of keys) if (k in s && s[k] != null) return s[k];
    return null;
  };

  // Populate campaign dropdown
  try {
    const data = await campaignService.getAll({ page: 1, per_page: 100, status: "" });
    const items = data?.data || [];
    campaignFilter.innerHTML =
      `<option value="">— Pilih Campaign —</option>` +
      items.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    const qId = query?.campaign_id || new URL(location.href).searchParams.get("campaign_id");
    if (qId && campaignFilter.querySelector(`option[value="${qId}"]`)) {
      campaignFilter.value = qId;
    }
  } catch {}

  let currentPage = 1;
  let currentCampaignId = campaignFilter.value || "";
  let currentKeyword = "";
  let debounce = null;

  // compute max slot across submissions (1..5) that have any content
  function computeMaxSlots(subs) {
    let max = 0;
    for (let i = 1; i <= 5; i++) {
      const hasAny = subs.some(s =>
        s[`link_${i}`] ||
        s[`post_date_${i}`] ||
        s[`screenshot_${i}_url`] || s[`screenshot_${i}_path`] ||
        s[`invoice_${i}_url`] || s[`invoice_${i}_path`] ||
        s[`review_proof_${i}_url`] || s[`review_proof_${i}_path`] ||
        s[`review_${i}_url`] || s[`review_${i}_path`] ||
        metric(s, i, "views") != null ||
        metric(s, i, "likes") != null ||
        metric(s, i, "comments") != null ||
        metric(s, i, "shares") != null
      );
      if (hasAny) max = i;
    }
    return max || 1;
  }

  async function loadSubmissions(page = 1) {
    if (!currentCampaignId) {
      listWrap.innerHTML = `<div class="alert alert-info">Silakan pilih <b>Campaign</b> terlebih dahulu.</div>`;
      pager.innerHTML = "";
      hideLoader();
      lastFiltered = [];
      lastCampaignName = "";
      return;
    }

    showLoader();
    try {
      const res = await submissionService.getAll({
        page,
        per_page: 20,
        include: "campaign",
        campaign_id: currentCampaignId,
      });

      const arr = res?.data || [];

      // Filter keyword (nama, open_id, link_1..5, alamat)
      const kw = (currentKeyword || "").toLowerCase().trim();
      const filtered = kw
        ? arr.filter((s) => {
            const name = kolNameOf(s);
            const addr = addressOf(s);
            const hay = [
              name,
              addr,
              s.tiktok_user_id || "",
              s.link_1 || "", s.link_2 || "", s.link_3 || "", s.link_4 || "", s.link_5 || "",
            ].join(" ").toLowerCase();
            return hay.includes(kw);
          })
        : arr;

      // simpan state untuk export
      lastFiltered = filtered.slice();
      lastCampaignName =
        filtered[0]?.campaign?.name ||
        (campaignFilter.selectedOptions[0]?.textContent || "").trim() ||
        "";

      // jika kosong
      if (!filtered.length) {
        listWrap.innerHTML = `
          <div class="table-responsive">
            <table class="table table-bordered bg-white">
              <thead>
                <tr><th class="text-center">KOL Name</th><th class="text-center">Actions</th></tr>
              </thead>
              <tbody><tr><td colspan="2" class="text-center text-muted">No data available</td></tr></tbody>
            </table>
          </div>`;
        pager.innerHTML = "";
        hideLoader();
        return;
      }

      // ====== table build (sticky name + actions, other scrollable) ======
      const SLOT_COLS = 9; // Link, Date, Screenshot, Invoice, Review, Views, Likes, Comments, Shares
      const maxSlots = computeMaxSlots(filtered);

      const btn = (u, label = "View") =>
        u ? `<a class="btn btn-sm btn-outline-secondary" href="${u}" target="_blank" rel="noopener">${label}</a>`
          : '<span class="text-muted">—</span>';

      const theadTopGroups = [];
      for (let i = 1; i <= maxSlots; i++) {
        theadTopGroups.push(
          `<th colspan="${SLOT_COLS}" class="text-center ${i % 2 === 0 ? "bg-light" : ""}">KOL Video ${i}</th>`
        );
      }
      const subMetrics = ["Video URL","Date","Screenshot","Invoice","Review","Views","Likes","Comments","Shares"];
      const theadSub = [];
      for (let i = 1; i <= maxSlots; i++) {
        theadSub.push(...subMetrics.map((m) =>
          `<th class="text-center ${i % 2 === 0 ? "bg-light" : ""}" style="min-width:120px">${m}</th>`
        ));
      }

      // Generate rows (pastikan kolom konsisten untuk semua baris)
      const rowsHtml = [];
      for (const s of filtered) {
        const displayName = kolNameOf(s);
        const addr = addressOf(s);
        const avatarUrl = kolAvatarOf(s);

        // determine resi button
        const isSentByBrand = s.acquisition_method === "sent_by_brand";
        const hasResi = !!(s.shipping_tracking_number || s.shipping_courier);
        const resiBtnHtml = isSentByBrand
          ? `<button class="btn btn-sm btn-outline-success btn-input-resi"
                data-id="${s.id}"
                data-courier="${s.shipping_courier ? String(s.shipping_courier).replace(/"/g, "&quot;") : ""}"
                data-resi="${s.shipping_tracking_number ? String(s.shipping_tracking_number).replace(/"/g, "&quot;") : ""}">
              <i class="bi bi-truck"></i> ${hasResi ? "Ubah Resi" : "Isi Resi"}
             </button>`
          : "";

        const slotCells = [];
        for (let slot = 1; slot <= maxSlots; slot++) {
          const link = s[`link_${slot}`] || "";
          const pdate = s[`post_date_${slot}`];
          const scPath = s[`screenshot_${slot}_url`] || s[`screenshot_${slot}_path`];
          const scUrl = toFileUrl(scPath);
          const invPath = s[`invoice_${slot}_url`] || s[`invoice_${slot}_path`] || s.invoice_file_url || s.invoice_file_path;
          const invUrl = toFileUrl(invPath);
          const revPath =
            s[`review_proof_${slot}_url`] || s[`review_proof_${slot}_path`] ||
            s[`review_${slot}_url`] || s[`review_${slot}_path`] ||
            s.review_proof_file_url || s.review_proof_file_path;
          const revUrl = toFileUrl(revPath);

          const views = metric(s, slot, "views") ?? metric(s, slot, "view");
          const likes = metric(s, slot, "likes") ?? metric(s, slot, "like");
          const comments = metric(s, slot, "comments") ?? metric(s, slot, "comment");
          const shares = metric(s, slot, "shares") ?? metric(s, slot, "share");

          const evenBg = slot % 2 === 0 ? "bg-light" : "";

          slotCells.push(
            `<td class="text-center ${evenBg}">${link ? `<a href="${link}" target="_blank" rel="noopener">Link</a>` : '<span class="text-muted">—</span>'}</td>`,
            `<td class="text-center ${evenBg}">${pdate ? fmtDate(pdate) : '<span class="text-muted">—</span>'}</td>`,
            `<td class="text-center ${evenBg}">${scUrl ? btn(scUrl, "View") : '<span class="text-muted">—</span>'}</td>`,
            `<td class="text-center ${evenBg}">${invUrl ? btn(invUrl, "Invoice") : '<span class="text-muted">—</span>'}</td>`,
            `<td class="text-center ${evenBg}">${revUrl ? btn(revUrl, "Review") : '<span class="text-muted">—</span>'}</td>`,
            `<td class="text-center ${evenBg}">${views != null ? fmtNum(views) : "—"}</td>`,
            `<td class="text-center ${evenBg}">${likes != null ? fmtNum(likes) : "—"}</td>`,
            `<td class="text-center ${evenBg}">${comments != null ? fmtNum(comments) : "—"}</td>`,
            `<td class="text-center ${evenBg}">${shares != null ? fmtNum(shares) : "—"}</td>`,
          );
        }

        rowsHtml.push(`
          <tr data-submission-id="${s.id}">
            <!-- sticky left -->
            <td class="sticky-col sticky-left">
              <div class="d-flex align-items-center gap-2">
                ${avatarUrl ? `<img src="${avatarUrl}" alt="" style="width:34px;height:34px;border-radius:50%;object-fit:cover">` : ""}
                <div>
                  <div class="fw-semibold text-truncate" style="max-width:180px" title="${displayName}">${displayName}</div>
                  ${addr ? `<div class="text-muted small text-truncate" style="max-width:180px" title="${addr}">${addr}</div>` : ""}
                </div>
              </div>
            </td>

            ${slotCells.join("")}

            <!-- sticky right -->
            <td class="sticky-col sticky-right">
              <div class="d-flex flex-column justify-content-center gap-2">
                ${resiBtnHtml}
                <div class="d-flex justify-content-center gap-2">
                  <button class="btn btn-sm btn-outline-primary" onclick="window.location.href='/admin/submissions/${s.id}/edit'" title="Edit">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-secondary btn-refresh-metrics" data-id="${s.id}" title="Refresh Metrics">
                    <i class="bi bi-arrow-clockwise"></i>
                  </button>
                </div>
              </div>
            </td>
          </tr>
        `);
      }

      const tableHtml = `
        <style>
          :root {
            --sticky-left-w: 220px;  /* width kolom Nama */
            --sticky-right-w: 180px; /* width kolom Actions */
          }
          .submissions-wrapper {
            border: 1px solid #dee2e6;
            border-radius: .25rem;
            overflow: hidden;
          }
          .submissions-scroll {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          table.submissions-table {
            margin-bottom: 0;
            border-collapse: separate;
            border-spacing: 0;
            min-width: calc(var(--sticky-left-w) + var(--sticky-right-w) + ${maxSlots} * ${SLOT_COLS} * 120px);
          }
          thead th {
            position: sticky;
            top: 0;
            z-index: 5;
            white-space: nowrap;
            background: #fff;
          }
          .sticky-col {
            position: sticky;
            background: #fff;
            z-index: 6;
          }
          .sticky-left { left: 0; width: var(--sticky-left-w); }
          .sticky-right { right: 0; width: var(--sticky-right-w); }
          /* Header sticky also for first/last */
          thead th.sticky-left { z-index: 7; }
          thead th.sticky-right { z-index: 7; }
          tbody td { vertical-align: middle; white-space: nowrap; }
          .bg-light { background-color: #F7F7F7 !important; }
        </style>

        <div class="submissions-wrapper">
          <div class="submissions-scroll">
            <table class="table table-bordered submissions-table">
              <thead>
                <tr>
                  <th class="text-center sticky-col sticky-left">KOL Name</th>
                  ${theadTopGroups.join("")}
                  <th class="text-center sticky-col sticky-right">Actions</th>
                </tr>
                <tr>
                  <th class="sticky-col sticky-left"></th>
                  ${theadSub.join("")}
                  <th class="sticky-col sticky-right"></th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml.join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
      listWrap.innerHTML = tableHtml;

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

  // ===== Export helper =====
  function exportVisibleToCSV() {
    if (!lastFiltered.length) {
      showToast("Tidak ada data untuk diekspor.", "error");
      return;
    }

    const rows = [];
    const header = [
      "Campaign","KOL Name","Avatar URL","TikTok User ID","Address",
      "Link","Post Date","Screenshot URL","Invoice URL","Review URL",
      "Views","Likes","Comments","Shares",
    ];
    rows.push(header);

    for (const s of lastFiltered) {
      const name = kolNameOf(s);
      const avatar = kolAvatarOf(s) || "";
      const openId = s.tiktok_user_id || "";
      const addr = addressOf(s);
      const campaign = s?.campaign?.name || lastCampaignName || "";

      for (let slot = 1; slot <= 5; slot++) {
        const link = s[`link_${slot}`] || "";
        const pdate = s[`post_date_${slot}`] || "";
        const scPath = s[`screenshot_${slot}_url`] || s[`screenshot_${slot}_path`];
        const scUrl = toFileUrl(scPath) || "";
        const invUrl = toFileUrl(s[`invoice_${slot}_url`] || s[`invoice_${slot}_path`] || s.invoice_file_url || s.invoice_file_path) || "";
        const revUrl = toFileUrl(
          s[`review_proof_${slot}_url`] || s[`review_proof_${slot}_path`] ||
          s[`review_${slot}_url`] || s[`review_${slot}_path`] ||
          s.review_proof_file_url || s.review_proof_file_path
        ) || "";

        const views = metric(s, slot, "views") ?? metric(s, slot, "view");
        const likes = metric(s, slot, "likes") ?? metric(s, slot, "like");
        const comments = metric(s, slot, "comments") ?? metric(s, slot, "comment");
        const shares = metric(s, slot, "shares") ?? metric(s, slot, "share");

        if (link || pdate || scUrl || invUrl || revUrl) {
          rows.push([
            campaign, name, avatar, openId, addr,
            link, pdate ? new Date(pdate).toLocaleDateString("id-ID") : "",
            scUrl, invUrl, revUrl,
            views ?? "", likes ?? "", comments ?? "", shares ?? "",
          ]);
        }
      }
    }

    const toCSV = (arr) =>
      arr.map((r) =>
        r.map((c) => {
          const val = c == null ? "" : String(c);
          if (/[",\n]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
          return val;
        }).join(",")
      ).join("\n");

    const csv = "\uFEFF" + toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const cleanName = (lastCampaignName || "submissions").replace(/[^\w\-]+/g, "_");
    const fileName = `submissions_${cleanName}_${y}${m}${d}_${hh}${mm}.csv`;

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();

    showToast("Export selesai. File siap diunduh.");
  }

  // ===== Modal helpers (Input Resi)
  const resiModal = document.getElementById("resiModal");
  const resiCourierEl = document.getElementById("resi_courier");
  const resiTrackEl = document.getElementById("resi_tracking");
  const resiIdEl = document.getElementById("resi_submission_id");
  const resiBtnSave = document.querySelector("#resiModal .btn-save-resi");
  const resiBtnCancel = document.querySelector("#resiModal .btn-cancel-resi");
  const resiBtnClose = document.querySelector("#resiModal .btn-close-resi");

  function openResiModal({ id, courier = "", tracking = "" } = {}) {
    if (!resiModal) return;
    resiIdEl.value = id || "";
    resiCourierEl.value = courier || "";
    resiTrackEl.value = tracking || "";
    resiModal.classList.remove("d-none");
    setTimeout(() => resiCourierEl?.focus?.(), 50);
  }
  function closeResiModal() {
    if (!resiModal) return;
    resiModal.classList.add("d-none");
    resiIdEl.value = "";
    resiCourierEl.value = "";
    resiTrackEl.value = "";
  }

  // close events
  resiBtnCancel?.addEventListener("click", closeResiModal);
  resiBtnClose?.addEventListener("click", closeResiModal);
  resiModal?.addEventListener("click", (e) => { if (e.target === resiModal) closeResiModal(); });

  // save event
  resiBtnSave?.addEventListener("click", async () => {
    const id = resiIdEl.value;
    const courier = (resiCourierEl.value || "").trim();
    const tracking = (resiTrackEl.value || "").trim();

    if (!id) { showToast("ID submission tidak valid.", "error"); return; }
    if (!courier || !tracking) { showToast("Nama ekspedisi dan nomor resi wajib diisi.", "error"); return; }

    const oldHtml = resiBtnSave.innerHTML;
    resiBtnSave.disabled = true;
    resiBtnSave.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Simpan`;

    try {
      const fd = new FormData();
      fd.set("_method", "PATCH");
      fd.set("shipping_courier", courier);
      fd.set("shipping_tracking_number", tracking);

      if (submissionService?.update) {
        await submissionService.update(id, fd);
      } else {
        const r = await fetch(`/api/influencer-submissions/${id}`, {
          method: "POST", credentials: "same-origin", body: fd,
        });
        if (!r.ok) throw new Error("Gagal menyimpan resi");
        await r.json();
      }

      showToast("Resi berhasil disimpan");
      closeResiModal();
      await loadSubmissions(currentPage);
    } catch (err) {
      showToast(err?.message || "Gagal menyimpan resi", "error");
    } finally {
      resiBtnSave.disabled = false;
      resiBtnSave.innerHTML = oldHtml;
    }
  });

  function attachActionHandlers() {
    // navigasi app-link
    document.querySelectorAll(".app-link").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const href = el.getAttribute("data-href");
        if (!href) return;
        history.pushState(null, "", href);
        window.dispatchEvent(new PopStateEvent("popstate"));
      });
    });

    // refresh per submission
    document.querySelectorAll(".btn-refresh-metrics").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const id = btn.getAttribute("data-id");
        const old = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Refresh`;

        try {
          const resp = await submissionService.refreshMetrics(id);
          showToast(resp?.message || "Metrik berhasil di-refresh.");
          await loadSubmissions(currentPage);
        } catch (err) {
          if ((err?.status === 401 || err?.status === 409) && err?.reauth_url) {
            showToast(err?.message || "Token TikTok tidak valid. Silakan connect ulang.", "error");
          } else {
            showToast(err?.message || "Gagal refresh metrik", "error");
          }
        } finally {
          btn.disabled = false;
          btn.innerHTML = old;
        }
      });
    });

    // open resi modal
    document.querySelectorAll(".btn-input-resi").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const id = btn.getAttribute("data-id");
        const courier = btn.getAttribute("data-courier") || "";
        const resi = btn.getAttribute("data-resi") || "";
        openResiModal({ id, courier, tracking: resi });
      });
    });

    // refresh semua yang terlihat
    if (refreshAllBtn) {
      refreshAllBtn.onclick = async () => {
        const ids = Array.from(document.querySelectorAll("tr[data-submission-id]"))
          .map((tr) => tr.getAttribute("data-submission-id"))
          .filter(Boolean);

        if (!ids.length) {
          showToast("Tidak ada baris untuk di-refresh.", "error");
          return;
        }

        const old = refreshAllBtn.innerHTML;
        refreshAllBtn.disabled = true;
        refreshAllBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Refreshing…`;

        let ok = 0, fail = 0;
        for (const id of ids) {
          try { await submissionService.refreshMetrics(id); ok++; }
          catch { fail++; }
        }

        await loadSubmissions(currentPage);
        refreshAllBtn.disabled = false;
        refreshAllBtn.innerHTML = old;

        showToast(`Refresh selesai: ${ok} sukses, ${fail} gagal.`);
      };
    }

    // export via server (tetap)
    if (exportBtn) {
      exportBtn.onclick = () => {
        const campaignId = (campaignFilter.value || "").trim();
        if (!campaignId) {
          showToast("Pilih campaign dulu ya.", "error");
          return;
        }
        const q = (searchInput.value || "").trim();
        const url = `/api/influencer-submissions/export?campaign_id=${encodeURIComponent(campaignId)}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
        window.open(url, "_blank");
      };
    }
  }

  campaignFilter.addEventListener("change", () => {
    currentCampaignId = campaignFilter.value || "";
    currentPage = 1;
    loadSubmissions(currentPage);
  });

  searchInput.addEventListener("input", (e) => {
    currentKeyword = e.target.value;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      currentPage = 1;
      loadSubmissions(currentPage);
    }, 250);
  });

  if (campaignFilter.value) {
    currentCampaignId = campaignFilter.value;
    loadSubmissions(currentPage);
  } else {
    hideLoader();
  }
}
