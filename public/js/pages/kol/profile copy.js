// /js/pages/kol/my-profile.js
export function render(target, params, query = {}, labelOverride = null) {
    const v = window.BUILD_VERSION || Date.now();
    const HEADER_H = 127;

    target.innerHTML = `
    <div class="container-fluid px-0" style="margin-top:${HEADER_H}px;">
      <div class="d-flex flex-column flex-md-row" style="min-height: calc(100vh - ${HEADER_H}px);">

        <!-- Sidebar -->
        <aside class="bg-light border-end d-flex flex-column" style="flex:0 0 300px; max-width:100%;">
          <!-- Profile -->
          <div class="text-center p-4 border-bottom">
            <div class="pb-3 position-relative" style="height:100px;">
              <i id="profileAvatarIcon" class="bi bi-person-circle" style="font-size:100px; line-height:100px;"></i>
              <img id="profileAvatarImg" src="" alt="Avatar"
                   class="d-none rounded-circle mx-auto position-absolute top-50 start-50 translate-middle"
                   style="width:100px; height:100px; object-fit:cover; border:3px solid #fff; box-shadow:0 4px 12px rgba(0,0,0,.12);" />
            </div>
            <div class="pt-3">
              <h5 id="profileName" class="fw-semibold">Creator</h5>
              <p id="profileHandle" class="text-muted small mb-0"></p>
            </div>
          </div>

          <!-- Campaigns -->
          <div class="flex-grow-1 p-3 overflow-auto">
            <h6 class="text-uppercase text-muted small fw-bold mb-3">CAMPAIGNS</h6>
            <div id="campaignList" class="d-grid gap-1">
              <div class="text-muted small">Loading campaigns…</div>
            </div>
          </div>

          <!-- Logout -->
          <div class="mt-auto p-3 border-top">
            <button id="logoutBtn" class="btn btn-danger w-100 d-flex align-items-center justify-content-center gap-2">
              <i class="bi bi-box-arrow-right"></i>
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-grow-1 bg-white d-flex flex-column">
          <div class="p-4 flex-grow-1">
            <h4 class="mb-4" id="mainCampaignTitle">My Campaign</h4>

            <!-- Notice existing -->
            <div id="existingNotice" class="alert alert-info d-none">
              Kamu sudah pernah mengirim data untuk campaign ini. Field yang sudah terisi dikunci.
              Klik <strong>Edit</strong> untuk mengganti, atau lengkapi bagian yang belum lengkap lalu tekan <strong>Update</strong>.
            </div>

            <!-- ===== Data Kontak ===== -->
            <div class="card mb-4">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h6 class="mb-0">Data Kontak</h6>
                  <button type="button" id="saveContactBtn" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-save"></i> Simpan Kontak
                  </button>
                </div>
                <div class="row g-3">
                  <div class="col-md-4">
                    <label for="contact_phone" class="form-label text-muted">No. Telepon / WhatsApp</label>
                    <input type="text" class="form-control" id="contact_phone" placeholder="+62xxxxxxxxxx">
                  </div>
                  <div class="col-md-4">
                    <label for="contact_email" class="form-label text-muted">Email</label>
                    <input type="email" class="form-control" id="contact_email" placeholder="nama@email.com">
                  </div>
                  <div class="col-md-4">
                    <label for="contact_address" class="form-label text-muted">Alamat</label>
                    <input type="text" class="form-control" id="contact_address" placeholder="Alamat lengkap">
                  </div>
                </div>
              </div>
            </div>

            <!-- ===== Draft Konten (Approval) ===== -->
            <div class="card mb-4" id="draftSection">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    <h6 class="mb-0">Draft Konten</h6>
                    <div class="small text-muted" id="draftQuotaHint">Isi minimal sesuai target konten.</div>
                  </div>
                  <button type="button" id="submitDraftBtn" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-send"></i> Kirim Draft
                  </button>
                </div>

                <!-- Dynamic rows: each has URL + Admin Status -->
                <div id="draftRows" class="row g-2"></div>
                <div class="small text-muted mt-2">
                  Admin akan meninjau draf yang kamu kirim dan memberikan approval / revisi.
                </div>

                <!-- status draft terakhir (global) -->
                <div id="draftStatus" class="mt-3 d-none">
                  <div class="small">
                    Status terakhir:
                    <span id="draftStatusBadge" class="badge bg-secondary">-</span>
                    <span id="draftUpdatedAt" class="text-muted ms-2">-</span>
                  </div>
                  <div id="draftReviewerNote" class="small text-muted mt-1 d-none"></div>
                </div>
              </div>
            </div>

            <form id="submissionForm" class="needs-validation" novalidate>
              <div class="row g-3">

                <!-- BARIS 1 -->
                <div class="col-12">
                  <div class="row g-3 align-items-end">
                    <div class="col-md-4">
                      <label for="link-1" class="form-label text-muted">Link Postingan 1</label>
                      <input type="url" class="form-control" id="link-1" placeholder="https://www.tiktok.com/...">
                      <div class="invalid-feedback">Jika diisi, harus URL yang valid.</div>
                    </div>
                    <div class="col-md-4">
                      <label for="post_date_1" class="form-label text-muted">Tanggal Postingan 1</label>
                      <input type="date" class="form-control" id="post_date_1">
                      <div class="invalid-feedback">Jika diisi, pilih tanggal yang valid.</div>
                    </div>
                    <div class="col-md-4">
                      <label for="screenshot_1" class="form-label text-muted">Screenshot Postingan 1</label>
                      <input type="file" class="form-control" id="screenshot_1" accept="image/*">
                      <a id="screenshot_1_view" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-sm mt-2 d-none">Lihat Gambar</a>
                    </div>
                  </div>
                </div>

                <!-- BARIS 2 -->
                <div class="col-12">
                  <div class="row g-3 align-items-end">
                    <div class="col-md-4">
                      <label for="link-2" class="form-label text-muted">Link Postingan 2</label>
                      <input type="url" class="form-control" id="link-2" placeholder="https://www.tiktok.com/...">
                      <div class="invalid-feedback">Jika diisi, harus URL yang valid.</div>
                    </div>
                    <div class="col-md-4">
                      <label for="post_date_2" class="form-label text-muted">Tanggal Postingan 2</label>
                      <input type="date" class="form-control" id="post_date_2">
                      <div class="invalid-feedback">Jika diisi, pilih tanggal yang valid.</div>
                    </div>
                    <div class="col-md-4">
                      <label for="screenshot_2" class="form-label text-muted">Screenshot Postingan 2</label>
                      <input type="file" class="form-control" id="screenshot_2" accept="image/*">
                      <a id="screenshot_2_view" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-sm mt-2 d-none">Lihat Gambar</a>
                    </div>
                  </div>
                </div>

                <!-- BARIS 3 (hidden by default) -->
                <div id="row-slot-3" class="col-12 d-none">
                  <div class="row g-3 align-items-end">
                    <div class="col-md-4">
                      <label for="link-3" class="form-label text-muted">Link Postingan 3</label>
                      <input type="url" class="form-control" id="link-3" placeholder="https://www.tiktok.com/...">
                      <div class="invalid-feedback">Jika diisi, harus URL yang valid.</div>
                    </div>
                    <div class="col-md-4">
                      <label for="post_date_3" class="form-label text-muted">Tanggal Postingan 3</label>
                      <input type="date" class="form-control" id="post_date_3">
                      <div class="invalid-feedback">Jika diisi, pilih tanggal yang valid.</div>
                    </div>
                    <div class="col-md-4">
                      <label for="screenshot_3" class="form-label text-muted">Screenshot Postingan 3</label>
                      <input type="file" class="form-control" id="screenshot_3" accept="image/*">
                      <a id="screenshot_3_view" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-sm mt-2 d-none">Lihat Gambar</a>
                    </div>
                  </div>
                </div>

                <!-- BARIS 4 (hidden by default) -->
                <div id="row-slot-4" class="col-12 d-none">
                  <div class="row g-3 align-items-end">
                    <div class="col-md-4">
                      <label for="link-4" class="form-label text-muted">Link Postingan 4</label>
                      <input type="url" class="form-control" id="link-4" placeholder="https://www.tiktok.com/...">
                      <div class="invalid-feedback">Jika diisi, harus URL yang valid.</div>
                    </div>
                    <div class="col-md-4">
                      <label for="post_date_4" class="form-label text-muted">Tanggal Postingan 4</label>
                      <input type="date" class="form-control" id="post_date_4">
                      <div class="invalid-feedback">Jika diisi, pilih tanggal yang valid.</div>
                    </div>
                    <div class="col-md-4">
                      <label for="screenshot_4" class="form-label text-muted">Screenshot Postingan 4</label>
                      <input type="file" class="form-control" id="screenshot_4" accept="image/*">
                      <a id="screenshot_4_view" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-sm mt-2 d-none">Lihat Gambar</a>
                    </div>
                  </div>
                </div>

                <!-- BARIS 5 (hidden by default) -->
                <div id="row-slot-5" class="col-12 d-none">
                  <div class="row g-3 align-items-end">
                    <div class="col-md-4">
                      <label for="link-5" class="form-label text-muted">Link Postingan 5</label>
                      <input type="url" class="form-control" id="link-5" placeholder="https://www.tiktok.com/...">
                      <div class="invalid-feedback">Jika diisi, harus URL yang valid.</div>
                    </div>
                    <div class="col-md-4">
                      <label for="post_date_5" class="form-label text-muted">Tanggal Postingan 5</label>
                      <input type="date" class="form-control" id="post_date_5">
                      <div class="invalid-feedback">Jika diisi, pilih tanggal yang valid.</div>
                    </div>
                    <div class="col-md-4">
                      <label for="screenshot_5" class="form-label text-muted">Screenshot Postingan 5</label>
                      <input type="file" class="form-control" id="screenshot_5" accept="image/*">
                      <a id="screenshot_5_view" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-sm mt-2 d-none">Lihat Gambar</a>
                    </div>
                  </div>
                </div>

                <!-- Add more button -->
                <div class="col-12 d-flex align-items-center gap-3 d-none">
                  <button type="button" id="addMoreBtn" class="btn btn-outline-dark btn-sm">
                    + Tambah Postingan
                  </button>
                  <span class="small text-muted" id="postQuotaHint"></span>
                </div>

                <!-- CARA MENDAPATKAN PRODUK -->
                <div class="col-md-6">
                  <label for="acquisition_method" class="form-label text-muted">Cara Mendapatkan Produk</label>
                  <select id="acquisition_method" class="form-select">
                    <option value="">-- Pilih --</option>
                    <option value="buy">Beli sendiri</option>
                    <option value="sent_by_brand">Dikirim oleh Brand</option>
                  </select>
                </div>

                <!-- FIELD: BELI -->
                <div id="purchaseFields" class="col-12 d-none">
                  <div class="row g-3 align-items-end">
                    <div class="col-md-6">
                      <label for="purchase_platform" class="form-label text-muted">Beli di mana</label>
                      <select id="purchase_platform" class="form-select">
                        <option value="">-- Pilih --</option>
                        <option value="tiktokshop">TikTok Shop</option>
                        <option value="shopee">Shopee</option>
                      </select>
                    </div>
                    <div class="col-md-6">
                      <label for="purchase_price" class="form-label text-muted">Harga Beli</label>
                      <input type="number" min="0" step="0.01" class="form-control" id="purchase_price" placeholder="0">
                    </div>
                  </div>
                </div>

                <!-- FIELD: DIKIRIM BRAND (VIEW-ONLY) -->
                <div id="shippingFields" class="col-12 d-none">
                  <div class="row g-3 align-items-end">
                    <div class="col-md-6">
                      <label class="form-label text-muted">Nama Ekspedisi</label>
                      <input type="text" class="form-control" id="shipping_courier" placeholder="Diisi oleh admin" disabled>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label text-muted">Nomor Resi</label>
                      <input type="text" class="form-control" id="shipping_tracking_number" placeholder="Diisi oleh admin" disabled>
                    </div>
                  </div>
                  <div class="text-muted small mt-1">Ekspedisi & Nomor Resi akan diisi oleh admin.</div>
                </div>

                <!-- Invoice & Bukti Review -->
                <div class="col-md-6">
                  <label for="invoice_file" class="form-label text-muted">Upload Invoice Pembelian</label>
                  <input type="file" class="form-control" id="invoice_file" accept="application/pdf,image/*">
                  <small class="text-muted">PDF/JPG/PNG, opsional</small>
                  <a id="invoice_file_view" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-sm mt-2 d-none">Lihat File</a>
                </div>

                <div class="col-md-6">
                  <label for="review_proof_file" class="form-label text-muted">Upload Bukti Review/Rate</label>
                  <input type="file" class="form-control" id="review_proof_file" accept="application/pdf,image/*">
                  <small class="text-muted">PDF/JPG/PNG, opsional</small>
                  <a id="review_proof_file_view" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-sm mt-2 d-none">Lihat File</a>
                </div>

                <!-- Actions -->
                <div class="col-12 pt-2 d-flex justify-content-end gap-2">
                  <button type="button" class="btn btn-outline-secondary d-none" id="cancelEditBtn">Batal</button>
                  <button type="button" class="btn btn-outline-dark d-none" id="editBtn">Edit</button>
                  <button type="submit" class="btn btn-dark px-4" id="submitBtn">Kirim</button>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  `;

    Promise.all([
        import(`/js/components/headerKol.js?v=${v}`),
        import(`/js/components/footerKol.js?v=${v}`),
        import(`/js/services/influencerRegistrationService.js?v=${v}`),
        import(`/js/services/influencerSubmissionService.js?v=${v}`),
        import(`/js/components/loader.js?v=${v}`),
        import(`/js/utils/toast.js?v=${v}`),
    ])
        .then(
            async ([
                headerMod,
                footerMod,
                regSvcMod,
                subSvcMod,
                loaderMod,
                toastMod,
            ]) => {
                const { renderHeaderKol } = headerMod;
                const { renderFooterKol } = footerMod;
                const { influencerService } = regSvcMod;
                const { submissionService } = subSvcMod;
                const { showLoader, hideLoader } = loaderMod;
                const { showToast } = toastMod;

                renderHeaderKol("header");
                renderFooterKol();

                // ===== Helpers

                // Status → label & badge color (UPDATED)
                const statusTextMap = {
                    pending: "Waiting for Approval",
                    approved: "Approve",
                    rejected: "Need to Revise",
                };
                const statusBadgeMap = {
                    pending: "warning",
                    approved: "success",
                    rejected: "danger",
                };
                const statusToUi = (raw) => {
                    const s = String(raw || "").toLowerCase();
                    return {
                        text: statusTextMap[s] || "-",
                        badge: statusBadgeMap[s] || "secondary",
                    };
                };

                const $ = (sel) => document.querySelector(sel);
                const safe = (v, d = "") => (v == null ? d : v);
                const hasVal = (v) =>
                    v !== undefined && v !== null && String(v).trim() !== "";
                const toInputDate = (val) => {
                    if (!val) return "";
                    const d = new Date(val);
                    if (isNaN(d)) return String(val).slice(0, 10);
                    const k = new Date(
                        d.getTime() - d.getTimezoneOffset() * 60000
                    );
                    return k.toISOString().slice(0, 10);
                };

                // CSRF helpers
                let csrfToken =
                    document.querySelector('meta[name="csrf-token"]')
                        ?.content ||
                    window.CSRF_TOKEN ||
                    null;
                async function ensureCsrf() {
                    if (csrfToken) return csrfToken;
                    try {
                        const r = await fetch("/api/csrf/refresh", {
                            method: "POST",
                            credentials: "same-origin",
                            headers: {
                                Accept: "application/json",
                                "X-Requested-With": "XMLHttpRequest",
                            },
                        });
                        if (r.ok) {
                            const j = await r.json();
                            csrfToken = j?.token || null;
                        }
                    } catch {}
                    return csrfToken;
                }
                async function fetchWithCsrf(url, options = {}) {
                    const token = await ensureCsrf();
                    const headers = new Headers(options.headers || {});
                    headers.set("X-Requested-With", "XMLHttpRequest");
                    if (token) headers.set("X-CSRF-TOKEN", token);
                    return fetch(url, { ...options, headers });
                }

                // profile helpers
                const normalizeHandle = (val) =>
                    (val || "").toString().trim().replace(/^@+/, "");
                const makePseudoId = (handle) => {
                    const h = normalizeHandle(handle).toLowerCase();
                    return h ? `pseudo_${h}` : "";
                };
                const readLocalProfile = () => {
                    try {
                        return JSON.parse(
                            localStorage.getItem("kol_profile") || "null"
                        );
                    } catch {
                        return null;
                    }
                };
                const mergeProfile = (me = {}, cache = {}) => {
                    const username =
                        me.tiktok_username || cache?.tiktok_username || "";
                    const openId =
                        me.tiktok_user_id ||
                        cache?.tiktok_user_id ||
                        makePseudoId(username);
                    return {
                        tiktok_full_name:
                            me.tiktok_full_name ||
                            cache?.full_name ||
                            "Creator",
                        tiktok_username: normalizeHandle(username),
                        tiktok_avatar_url:
                            me.tiktok_avatar_url ||
                            cache?.profile_pic_url ||
                            "",
                        tiktok_user_id: openId,
                    };
                };

                // file viewer helpers
                const toFileUrl = (input) => {
                    if (!hasVal(input)) return "";
                    const origin = location.origin;
                    let raw = String(input).trim();
                    if (/^(blob:|data:|https?:\/\/)/i.test(raw)) {
                        try {
                            const u = new URL(raw);
                            if (u.origin === origin) {
                                if (/^\/?files/i.test(u.pathname)) return raw;
                                if (/^\/?storage\//i.test(u.pathname)) {
                                    const stripped = u.pathname.replace(
                                        /^\/?storage\/+/i,
                                        ""
                                    );
                                    return `${origin}/files?p=${encodeURIComponent(
                                        stripped
                                    )}`;
                                }
                            }
                            return raw;
                        } catch {
                            return raw;
                        }
                    }
                    if (/^\/?files\?/i.test(raw))
                        return `${origin}/${raw.replace(/^\/+/, "")}`;
                    const normalized = raw
                        .replace(/^\/+/, "")
                        .replace(/^storage\/+/i, "");
                    return `${origin}/files?p=${encodeURIComponent(
                        normalized
                    )}`;
                };
                const getFileUrl = (rec, key) => {
                    if (!rec) return "";
                    const candidates = [
                        `${key}_url`,
                        `${key}`,
                        key.replace("_", ""),
                        `${key}Url`,
                        `${key}URL`,
                        `${key}_path`,
                        `${key}Path`,
                    ];
                    for (const k of candidates) {
                        if (hasVal(rec?.[k])) return toFileUrl(rec[k]);
                    }
                    if (rec?.files && hasVal(rec.files[key]))
                        return toFileUrl(rec.files[key]);
                    return "";
                };
                const setFileControls = (
                    inputId,
                    remoteUrl,
                    { editMode = false, btnText = "Lihat File" } = {}
                ) => {
                    const input = $("#" + inputId);
                    const viewBtn = $("#" + inputId + "_view");
                    if (!input || !viewBtn) return;
                    if (hasVal(remoteUrl)) {
                        viewBtn.href = remoteUrl;
                        viewBtn.textContent = inputId.includes("screenshot")
                            ? "Lihat Gambar"
                            : btnText;
                        viewBtn.classList.remove("d-none");
                        viewBtn.dataset.remote = "1";
                    } else {
                        viewBtn.classList.add("d-none");
                        viewBtn.removeAttribute("href");
                        delete viewBtn.dataset.remote;
                    }
                    if (editMode) input.classList.remove("d-none");
                    else {
                        if (hasVal(remoteUrl)) input.classList.add("d-none");
                        else input.classList.remove("d-none");
                    }
                    if (input.classList.contains("d-none")) input.value = "";
                };
                const wirePreview = (inputId) => {
                    const input = $("#" + inputId);
                    const viewBtn = $("#" + inputId + "_view");
                    if (!input || !viewBtn) return;
                    input.addEventListener("change", () => {
                        const f = input.files?.[0];
                        if (f) {
                            const blobUrl = URL.createObjectURL(f);
                            viewBtn.href = blobUrl;
                            viewBtn.textContent = inputId.includes("screenshot")
                                ? "Preview Gambar"
                                : "Preview File";
                            viewBtn.classList.remove("d-none");
                            viewBtn.dataset.remote = "0";
                        } else {
                            if (viewBtn.dataset.remote !== "1") {
                                viewBtn.classList.add("d-none");
                                viewBtn.removeAttribute("href");
                            }
                        }
                    });
                };

                // ===== State
                let openId = null;
                let selectedCampaignId = null;
                let currentSubmission = null;
                let isEditing = false;

                // Draft locks per slot (lock ONLY when draft exists and NOT approved)
                let draftLockBySlot = new Set();

                // Registrations per campaign
                let regsMapByCampaign = new Map();
                let currentRegistration = null;

                // ===== Content quota / slots =====
                const MAX_SLOTS = 5;
                let requiredPostCount = 1; // target minimal posting (opsional/NOT mandatory)
                let requiredDraftCount = 1; // minimal draft WAJIB: minimal isi 1 saat submit
                let visibleSlots = 2;

                const campaignDetailCache = new Map();

                const clampInt = (n, min, max) => {
                    const x = Math.floor(Number(n) || 0);
                    return Math.min(Math.max(x, min), max);
                };
                const coalesceNumber = (...vals) => {
                    for (const v of vals) {
                        if (v == null) continue;
                        const n = Number(v);
                        if (!Number.isNaN(n)) return n;
                    }
                    return null;
                };

                async function fetchCampaignDetail(campaignId) {
                    const key = String(campaignId);
                    if (campaignDetailCache.has(key))
                        return campaignDetailCache.get(key);
                    try {
                        const r = await fetch(
                            `/api/campaigns/${campaignId}?_=${Date.now()}`,
                            {
                                headers: { Accept: "application/json" },
                                credentials: "same-origin",
                                cache: "no-store",
                            }
                        );
                        if (!r.ok) return null;
                        const j = await r.json();
                        campaignDetailCache.set(key, j);
                        return j;
                    } catch {
                        return null;
                    }
                }

                async function getCampaignContentTarget(campaignId) {
                    const detail = await fetchCampaignDetail(campaignId);
                    if (!detail) return null;
                    const kpi =
                        detail.kpi_targets ||
                        detail.kpi ||
                        detail.kpiTargets ||
                        {};
                    const target = coalesceNumber(
                        detail.content_quota,
                        detail.content_target,
                        detail.post_target,
                        detail.posts_target,
                        detail.total_posts_target,
                        kpi?.content_quota,
                        kpi?.content,
                        kpi?.contents,
                        kpi?.posts
                    );
                    if (target == null) return null;
                    return clampInt(target, 1, MAX_SLOTS);
                }

                // ===== Multi-slot posts UI
                const slotRow = (i) => document.querySelector(`#row-slot-${i}`);
                const showSlot = (i) => {
                    if (i <= 2) return; // baris 1-2 selalu terlihat
                    const row = slotRow(i);
                    if (row) row.classList.remove("d-none");
                    if (visibleSlots < i) visibleSlots = i;
                    updateAddMoreBtn();
                };
                const hideSlot = (i) => {
                    const row = slotRow(i);
                    if (row) row.classList.add("d-none");
                };
                const updateAddMoreBtn = () => {
                    const btn = $("#addMoreBtn");
                    if (!btn) return;
                    btn.classList.toggle("d-none", visibleSlots >= MAX_SLOTS);
                };
                const revealNextSlot = () => {
                    if (visibleSlots < MAX_SLOTS) showSlot(visibleSlots + 1);
                };
                $("#addMoreBtn")?.addEventListener("click", revealNextSlot);

                const slotHasData = (rec, i) => {
                    const has = (k) => rec && hasVal(rec[k]);
                    return (
                        has(`link_${i}`) ||
                        has(`post_date_${i}`) ||
                        has(`screenshot_${i}_url`) ||
                        has(`screenshot_${i}_path`)
                    );
                };
                const resetSlotVisibility = () => {
                    visibleSlots = Math.max(2, requiredPostCount);
                    for (let i = 3; i <= MAX_SLOTS; i++) {
                        if (i <= visibleSlots) showSlot(i);
                        else hideSlot(i);
                    }
                    updateAddMoreBtn();
                };

                // >>> posts tidak mandatory: hanya ubah hint
                function applyRequiredAttributes() {
                    const postHint = $("#postQuotaHint");
                    if (postHint) {
                        postHint.textContent = `Target minimal posting: ${requiredPostCount} konten (opsional, bisa dilengkapi kapan saja)`;
                    }
                    const draftHint = $("#draftQuotaHint");
                    if (draftHint) {
                        draftHint.textContent = `Jumlah draft konten yang perlu dikirim: ${requiredDraftCount} draft konten`;
                    }
                }

                // ===== Draft Rows (URL + STATUS ADMIN) =====
                const draftRowsWrap = () => $("#draftRows");
                let currentDraftRowCount = 0;
                function buildDraftRows(count) {
                    const c = clampInt(count || 1, 1, MAX_SLOTS);
                    const wrap = draftRowsWrap();
                    if (!wrap) return;
                    wrap.innerHTML = "";
                    for (let i = 1; i <= c; i++) {
                        const row = document.createElement("div");
                        row.className = "col-12 draft-row";
                        row.innerHTML = `
            <div class="row g-2 align-items-center">
              <div class="col-md-6">
                <label class="form-label text-muted">Draft ${i} (URL)</label>
                <input type="url" class="form-control draft-url" id="draft_url_${i}" placeholder="https://...">
                <div class="invalid-feedback">Masukkan URL draft yang valid.</div>
              </div>
              <div class="col-md-6">
                <label class="form-label text-muted d-block">Status & Catatan Admin</label>
                <div class="d-flex align-items-center gap-2">
                  <span id="draft_status_badge_${i}" class="badge bg-secondary">-</span>
                  <small id="draft_status_time_${i}" class="text-muted"></small>
                </div>
                <div id="draft_admin_note_${i}" class="small text-muted mt-1">-</div>
              </div>
            </div>
          `;
                        wrap.appendChild(row);
                    }
                    currentDraftRowCount = c;
                }
                function ensureDraftRowExists(slot) {
                    if (slot <= currentDraftRowCount) return;
                    buildDraftRows(slot);
                }

                function setDraftButtonState(disabled) {
                    const submitDraftBtn = $("#submitDraftBtn");
                    if (!submitDraftBtn) return;
                    submitDraftBtn.disabled = !!disabled;
                    submitDraftBtn.innerHTML = disabled
                        ? `<span class="spinner-border spinner-border-sm me-1"></span> Mengirim…`
                        : `<i class="bi bi-send"></i> Kirim Draft`;
                }

                // Status draft (global)
                const draftStatusWrap = $("#draftStatus");
                const draftStatusBadge = $("#draftStatusBadge");
                const draftUpdatedAtEl = $("#draftUpdatedAt");
                const draftReviewerNote = $("#draftReviewerNote");

                function showDraftStatus({
                    status = "-",
                    updated_at = null,
                    reviewer_note = "",
                } = {}) {
                    if (!draftStatusWrap) return;
                    //draftStatusWrap.classList.remove('d-none');

                    const { text, badge } = statusToUi(status);

                    draftStatusBadge.className = `badge bg-${badge}`;
                    draftStatusBadge.textContent = text;
                    draftUpdatedAtEl.textContent = updated_at
                        ? new Date(updated_at).toLocaleString("id-ID")
                        : "";

                    if (reviewer_note && reviewer_note.trim()) {
                        draftReviewerNote.textContent = `Catatan reviewer: ${reviewer_note}`;
                        draftReviewerNote.classList.remove("d-none");
                    } else {
                        draftReviewerNote.classList.add("d-none");
                        draftReviewerNote.textContent = "";
                    }
                }

                // Per-baris status helper (UPDATED text)
                function showRowDraftStatus(
                    i,
                    { status = "-", reviewer_note = "", updated_at = null } = {}
                ) {
                    const badgeEl = document.getElementById(
                        `draft_status_badge_${i}`
                    );
                    const timeEl = document.getElementById(
                        `draft_status_time_${i}`
                    );
                    const noteEl = document.getElementById(
                        `draft_admin_note_${i}`
                    );

                    const s = String(status).toLowerCase();
                    const badge = statusBadgeMap[s] || "secondary";
                    const text = statusTextMap[s] || "-";

                    if (badgeEl) {
                        badgeEl.className = `badge bg-${badge}`;
                        badgeEl.textContent = text;
                    }
                    if (timeEl) {
                        timeEl.textContent = updated_at
                            ? new Date(updated_at).toLocaleString("id-ID")
                            : "";
                    }
                    if (noteEl) {
                        noteEl.textContent = reviewer_note?.trim()
                            ? reviewer_note
                            : "-";
                    }
                }

                // Prefill draft dari submission (legacy single-slot support)
                function prefillDraftFromSubmission(rec) {
                    const url =
                        rec?.draft_url ||
                        rec?.draft_link ||
                        rec?.draft_text ||
                        rec?.draft ||
                        "";
                    const u1 = $("#draft_url_1");
                    if (u1 && !u1.value) u1.value = url || "";

                    const status = rec?.draft_status || null;
                    const ts =
                        rec?.draft_submitted_at ||
                        rec?.updated_at ||
                        rec?.created_at ||
                        null;
                    const reviewerNote = rec?.draft_reviewer_note || "";
                    if (status || reviewerNote || ts) {
                        showDraftStatus({
                            status: status || "pending",
                            updated_at: ts,
                            reviewer_note: reviewerNote,
                        });
                    } else {
                        draftStatusWrap?.classList.add("d-none");
                    }
                }

                // Build lock set dari data draft terbaru per slot
                function updateSlotLocksFromMap(bySlotMap) {
                    const next = new Set();
                    bySlotMap.forEach((d, slot) => {
                        const s = String(
                            d.status || d.draft_status || ""
                        ).toLowerCase();
                        // LOCK kalau draft ADA dan status BUKAN approved
                        if (s && s !== "approved") next.add(slot);
                    });
                    draftLockBySlot = next;
                    enforceSlotLocks();
                }

                // Load status + PREFILL URL per-slot (UPDATED)
                async function loadDraftStatus() {
                    if (!openId || !selectedCampaignId) {
                        draftStatusWrap?.classList.add("d-none");
                        for (let i = 1; i <= requiredDraftCount; i++)
                            showRowDraftStatus(i, {});
                        draftLockBySlot.clear();
                        enforceSlotLocks();
                        return;
                    }
                    try {
                        const qs = new URLSearchParams({
                            tiktok_user_id: openId,
                            campaign_id: selectedCampaignId,
                            per_page: String(MAX_SLOTS),
                            _: String(Date.now()),
                        }).toString();

                        const r = await fetch(
                            `/api/influencer-submissions/draft?${qs}`,
                            {
                                headers: { Accept: "application/json" },
                                credentials: "same-origin",
                                cache: "no-store",
                            }
                        );

                        if (!r.ok) {
                            draftStatusWrap?.classList.add("d-none");
                            return;
                        }

                        const j = await r.json();
                        const arr = Array.isArray(j) ? j : j?.data || [];

                        // Global (pakai item terbaru by updated_at)
                        const latest = arr[0];
                        if (latest) {
                            showDraftStatus({
                                status:
                                    latest.status ||
                                    latest.draft_status ||
                                    "pending",
                                updated_at:
                                    latest.updated_at ||
                                    latest.submitted_at ||
                                    latest.created_at,
                                reviewer_note:
                                    latest.reviewer_note || latest.note || "",
                            });
                        } else {
                            draftStatusWrap?.classList.add("d-none");
                        }

                        // Pastikan jumlah row cukup utk slot terbesar yang ada
                        let maxSlotSeen = requiredDraftCount;
                        for (const d of arr) {
                            const slot = Number(
                                d.slot ?? d.index ?? d.draft_slot ?? 0
                            );
                            if (slot > maxSlotSeen) maxSlotSeen = slot;
                        }
                        ensureDraftRowExists(maxSlotSeen);

                        // Per-slot map + PREFILL URL
                        const bySlot = new Map();
                        for (const d of arr) {
                            const slot = Number(
                                d.slot ?? d.index ?? d.draft_slot ?? 0
                            );
                            if (!slot) continue;
                            if (!bySlot.has(slot)) bySlot.set(slot, d);

                            // Prefill URL untuk slot tsb
                            const url =
                                d.url ||
                                d.draft_url ||
                                d.link ||
                                d.draft_link ||
                                "";
                            const uEl = document.getElementById(
                                `draft_url_${slot}`
                            );
                            if (uEl && !uEl.value && url) uEl.value = url;
                        }
                        for (let i = 1; i <= currentDraftRowCount; i++) {
                            const d = bySlot.get(i);
                            if (d) {
                                showRowDraftStatus(i, {
                                    status: d.status || d.draft_status || "-",
                                    reviewer_note:
                                        d.reviewer_note || d.note || "",
                                    updated_at:
                                        d.updated_at ||
                                        d.submitted_at ||
                                        d.created_at ||
                                        null,
                                });
                            } else {
                                showRowDraftStatus(i, {});
                            }
                        }

                        // Terapkan kunci per slot (lock jika BELUM approved)
                        updateSlotLocksFromMap(bySlot);
                    } catch {
                        draftStatusWrap?.classList.add("d-none");
                    }
                }

                function refreshDraftUiAvailability() {
                    const can = !!(openId && selectedCampaignId);
                    const submitDraftBtn = $("#submitDraftBtn");
                    if (submitDraftBtn) submitDraftBtn.disabled = !can;
                    if (!can && draftStatusWrap)
                        draftStatusWrap.classList.add("d-none");
                    // enable/disable URL inputs sesuai ketersediaan campaign
                    for (let i = 1; i <= currentDraftRowCount; i++) {
                        const u = $("#draft_url_" + i);
                        if (u) u.disabled = !can;
                    }
                }

                // Submit multi-draft (minimal 1 URL) — posts TIDAK mandatory
                $("#submitDraftBtn")?.addEventListener("click", async () => {
                    if (!selectedCampaignId || !openId) {
                        showToast("Pilih campaign dulu ya.", "error");
                        return;
                    }

                    // Kumpulkan URL yang terisi dari SEMUA baris draft yang ada
                    const filled = [];
                    for (let i = 1; i <= currentDraftRowCount; i++) {
                        const uVal = $("#draft_url_" + i)?.value.trim();
                        if (uVal) filled.push({ index: i, url: uVal });
                    }

                    // Minimal 1 draft saja
                    if (filled.length < 1) {
                        showToast(
                            "Minimal 1 draft (URL) harus diisi.",
                            "error"
                        );
                        return;
                    }

                    setDraftButtonState(true);
                    try {
                        let ok = 0,
                            fail = 0;
                        for (const item of filled) {
                            const uok =
                                /^https?:\/\//i.test(item.url) ||
                                /^(drive|docs)\.google\.com/i.test(item.url);
                            if (!uok) {
                                fail++;
                                continue;
                            }

                            const fd = new FormData();
                            fd.set("campaign_id", String(selectedCampaignId));
                            fd.set("tiktok_user_id", String(openId));
                            fd.set("draft_url", item.url);
                            fd.set("slot", String(item.index));

                            const r = await fetchWithCsrf(
                                "/api/influencer-submissions/draft",
                                {
                                    method: "POST",
                                    credentials: "same-origin",
                                    body: fd,
                                }
                            );
                            if (r.ok) ok++;
                            else fail++;
                        }
                        if (ok && !fail)
                            showToast(`Berhasil mengirim ${ok} draft.`);
                        else if (ok && fail)
                            showToast(
                                `Sebagian terkirim: ${ok} sukses, ${fail} gagal.`,
                                "warning"
                            );
                        else showToast("Gagal mengirim draft.", "error");

                        await loadDraftStatus();
                        const fresh = await fetchSubmissionForCampaign({
                            tiktok_user_id: openId,
                            campaign_id: selectedCampaignId,
                        });
                        if (fresh) {
                            currentSubmission = fresh;
                            prefillDraftFromSubmission(currentSubmission);
                        }
                    } catch (err) {
                        showToast(
                            err?.message || "Gagal mengirim draft.",
                            "error"
                        );
                    } finally {
                        setDraftButtonState(false);
                    }
                });

                // ===== UI helpers
                const setTitle = (txt) => {
                    $("#mainCampaignTitle").textContent = txt || "My Campaign";
                };
                const isComplete = (rec) =>
                    hasVal(rec?.link_1) && hasVal(rec?.post_date_1);

                // Acquisition elements
                const acquisitionEl = $("#acquisition_method");
                const purchaseWrap = $("#purchaseFields");
                const purchasePlatformEl = $("#purchase_platform");
                const purchasePriceEl = $("#purchase_price");
                const shippingWrap = $("#shippingFields");
                const shippingCourierEl = $("#shipping_courier");
                const shippingResiEl = $("#shipping_tracking_number");
                // Invoice
                const invoiceEl = $("#invoice_file");
                const invoiceView = $("#invoice_file_view");
                const invoiceCol = invoiceEl?.closest(".col-md-6");

                // === Contact DOM
                const contactPhoneEl = $("#contact_phone");
                const contactEmailEl = $("#contact_email");
                const contactAddressEl = $("#contact_address");
                const saveContactBtn = $("#saveContactBtn");

                const applyAcquisitionVisibility = () => {
                    const mode = acquisitionEl.value;
                    const showBuy = mode === "buy";
                    const showShip = mode === "sent_by_brand";
                    const hasInvoiceRemote = !!getFileUrl(
                        currentSubmission,
                        "invoice_file"
                    );

                    // Purchase
                    purchaseWrap.classList.toggle("d-none", !showBuy);
                    [purchasePlatformEl, purchasePriceEl].forEach((el) => {
                        if (!el) return;
                        if (showBuy) {
                            el.removeAttribute("disabled");
                            el.setAttribute("required", "required");
                        } else {
                            el.setAttribute("disabled", "disabled");
                            el.removeAttribute("required");
                            el.value = "";
                        }
                    });

                    // Invoice visibility with BUY
                    if (invoiceCol)
                        invoiceCol.classList.toggle("d-none", !showBuy);
                    if (invoiceEl) {
                        if (showBuy) {
                            invoiceEl.removeAttribute("disabled");
                            if (!hasInvoiceRemote)
                                invoiceEl.setAttribute("required", "required");
                            else invoiceEl.removeAttribute("required");
                        } else {
                            invoiceEl.setAttribute("disabled", "disabled");
                            invoiceEl.removeAttribute("required");
                            invoiceEl.value = "";
                            if (invoiceView) {
                                invoiceView.classList.add("d-none");
                                invoiceView.removeAttribute("href");
                                delete invoiceView.dataset.remote;
                            }
                        }
                    }

                    // Shipping VIEW-ONLY (never editable)
                    shippingWrap.classList.toggle("d-none", !showShip);
                    [shippingCourierEl, shippingResiEl].forEach((el) => {
                        if (!el) return;
                        el.setAttribute("disabled", "disabled");
                        el.removeAttribute("required");
                    });
                };
                acquisitionEl.addEventListener(
                    "change",
                    applyAcquisitionVisibility
                );

                const updateButtonsVisibility = () => {
                    const hasRecord = !!currentSubmission?.id;
                    const editBtn = $("#editBtn");
                    const cancelBtn = $("#cancelEditBtn");
                    const submitBtn = $("#submitBtn");

                    if (!hasRecord) {
                        editBtn.classList.add("d-none");
                        cancelBtn.classList.add("d-none");
                        submitBtn.textContent = "Kirim";
                        submitBtn.disabled = false;
                        return;
                    }
                    if (isEditing) {
                        editBtn.classList.add("d-none");
                        cancelBtn.classList.remove("d-none");
                        submitBtn.textContent = "Simpan Perubahan";
                        submitBtn.disabled = false;
                    } else {
                        editBtn.classList.remove("d-none");
                        cancelBtn.classList.add("d-none");
                        submitBtn.textContent = isComplete(currentSubmission)
                            ? "Update"
                            : "Lengkapi & Update";
                        submitBtn.disabled = false;
                    }
                };

                const fillSubmissionValues = (rec) => {
                    $("#link-1").value = safe(rec.link_1, "");
                    $("#link-2").value = safe(rec.link_2, "");
                    $("#post_date_1").value = toInputDate(rec.post_date_1);
                    $("#post_date_2").value = toInputDate(rec.post_date_2);
                    for (let i = 3; i <= MAX_SLOTS; i++) {
                        $("#link-" + i).value = safe(rec[`link_${i}`], "");
                        $("#post_date_" + i).value = toInputDate(
                            rec[`post_date_${i}`]
                        );
                    }
                    $("#acquisition_method").value = safe(
                        rec.acquisition_method,
                        ""
                    );
                    $("#purchase_platform").value = safe(
                        rec.purchase_platform,
                        ""
                    );
                    $("#purchase_price").value = safe(rec.purchase_price, "");
                    $("#shipping_courier").value = safe(
                        rec.shipping_courier,
                        ""
                    );
                    $("#shipping_tracking_number").value = safe(
                        rec.shipping_tracking_number,
                        ""
                    );

                    // slot visibility: tampilkan semua yang ada data + minimal required
                    visibleSlots = Math.max(requiredPostCount, 2);
                    for (let i = 3; i <= MAX_SLOTS; i++)
                        if (slotHasData(rec, i))
                            visibleSlots = Math.max(visibleSlots, i);
                    for (let i = 3; i <= MAX_SLOTS; i++)
                        i <= visibleSlots ? showSlot(i) : hideSlot(i);
                    updateAddMoreBtn();

                    applyAcquisitionVisibility();

                    // Prefill draft legacy (slot 1)
                    prefillDraftFromSubmission(rec);

                    // update hints
                    applyRequiredAttributes();
                };

                // Contact helpers
                const pickFirst = (obj, keys = []) => {
                    if (!obj) return "";
                    for (const k of keys)
                        if (
                            Object.prototype.hasOwnProperty.call(obj, k) &&
                            hasVal(obj[k])
                        )
                            return String(obj[k]);
                    return "";
                };
                const getContactFrom = (rec) => {
                    const phone = pickFirst(rec, [
                        "phone",
                        "phone_number",
                        "whatsapp",
                        "wa",
                        "mobile",
                        "telp",
                        "no_hp",
                        "contact_phone",
                    ]);
                    const email = pickFirst(rec, [
                        "email",
                        "contact_email",
                        "kol_email",
                    ]);
                    const addr = pickFirst(rec, [
                        "address",
                        "alamat",
                        "street_address",
                        "shipping_address",
                        "domicile",
                        "address_line",
                        "full_address",
                    ]);
                    return { phone, email, addr };
                };
                const fillContactFields = (reg, fallback = {}) => {
                    const fromReg = getContactFrom(reg || {});
                    const phone = fromReg.phone || fallback.phone || "";
                    const email = fromReg.email || fallback.email || "";
                    const addr = fromReg.addr || fallback.addr || "";
                    $("#contact_phone").value = phone;
                    $("#contact_email").value = email;
                    $("#contact_address").value = addr;
                };

                function enforceSlotLocks() {
                    for (let i = 1; i <= MAX_SLOTS; i++) {
                        const draftStatusBadgeEl = document.getElementById(
                            `draft_status_badge_${i}`
                        );
                        const isApproved =
                            draftStatusBadgeEl &&
                            (draftStatusBadgeEl.classList.contains(
                                "bg-success"
                            ) ||
                                draftStatusBadgeEl.textContent
                                    .trim()
                                    .toLowerCase() === "approved");
                        const locked = !isApproved; // true bila belum approved
                        const linkEl = document.getElementById("link-" + i);
                        const dateEl = document.getElementById(
                            "post_date_" + i
                        );
                        const screenshotEl = document.getElementById(
                            "screenshot_" + i
                        );
                        const buyMethodEl =
                            document.getElementById("acquisition_method");

                        const reviewEl =
                            document.getElementById("review_proof_file");

                        if (linkEl) {
                            // jika locked → disable; jika approved (not locked) biarkan normal (boleh isi)
                            linkEl.disabled = locked
                                ? true
                                : linkEl.disabled && !isEditing
                                ? true
                                : false;
                            linkEl.classList.toggle("is-draft-locked", locked);
                            if (locked)
                                linkEl.title =
                                    "Terkunci: draft untuk slot ini belum disetujui";
                            else linkEl.removeAttribute("title");
                        }
                        if (dateEl) {
                            dateEl.disabled = locked
                                ? true
                                : dateEl.disabled && !isEditing
                                ? true
                                : false;
                            dateEl.classList.toggle("is-draft-locked", locked);
                            if (locked)
                                dateEl.title =
                                    "Terkunci: draft untuk slot ini belum disetujui";
                            else dateEl.removeAttribute("title");
                        }
                        if (buyMethodEl) {
                            buyMethodEl.disabled = locked
                                ? true
                                : buyMethodEl.disabled && !isEditing
                                ? true
                                : false;
                            buyMethodEl.classList.toggle(
                                "is-draft-locked",
                                locked
                            );
                            if (locked)
                                buyMethodEl.title =
                                    "Terkunci: draft untuk slot ini belum disetujui";
                            else buyMethodEl.removeAttribute("title");
                        }
                        if (screenshotEl) {
                            screenshotEl.disabled = locked
                                ? true
                                : screenshotEl.disabled && !isEditing
                                ? true
                                : false;
                            screenshotEl.classList.toggle(
                                "is-draft-locked",
                                locked
                            );
                            if (locked)
                                screenshotEl.title =
                                    "Terkunci: draft untuk slot ini belum disetujui";
                            else screenshotEl.removeAttribute("title");
                        }
                        if (reviewEl) {
                            reviewEl.disabled = locked
                                ? true
                                : reviewEl.disabled && !isEditing
                                ? true
                                : false;
                            reviewEl.classList.toggle(
                                "is-draft-locked",
                                locked
                            );
                            if (locked)
                                reviewEl.title =
                                    "Terkunci: draft untuk slot ini belum disetujui";
                            else reviewEl.removeAttribute("title");
                        }
                    }
                }

                const applyViewMode = () => {
                    // lock fields yang sudah terisi (posts tetap tidak mandatory)
                    const controls = [];
                    for (let i = 1; i <= MAX_SLOTS; i++) {
                        controls.push({ id: "link-" + i, key: "link_" + i });
                        controls.push({
                            id: "post_date_" + i,
                            key: "post_date_" + i,
                        });
                    }
                    controls.push({
                        id: "acquisition_method",
                        key: "acquisition_method",
                    });
                    controls.push({
                        id: "purchase_platform",
                        key: "purchase_platform",
                    });
                    controls.push({
                        id: "purchase_price",
                        key: "purchase_price",
                    });

                    controls.forEach(({ id, key }) => {
                        const el = $("#" + id);
                        if (!el) return;
                        const filled = hasVal(currentSubmission?.[key]);
                        el.disabled = filled; // tetap kunci kalau sudah terisi
                        el.removeAttribute("required"); // pastikan tidak mandatory
                    });

                    // shipping inputs ALWAYS disabled (view-only)
                    [
                        $("#shipping_courier"),
                        $("#shipping_tracking_number"),
                    ].forEach((el) => {
                        el?.setAttribute("disabled", "disabled");
                        el?.removeAttribute("required");
                    });

                    // file controls
                    setFileControls(
                        "screenshot_1",
                        getFileUrl(currentSubmission, "screenshot_1"),
                        { editMode: false }
                    );
                    setFileControls(
                        "screenshot_2",
                        getFileUrl(currentSubmission, "screenshot_2"),
                        { editMode: false }
                    );
                    setFileControls(
                        "screenshot_3",
                        getFileUrl(currentSubmission, "screenshot_3"),
                        { editMode: false }
                    );
                    setFileControls(
                        "screenshot_4",
                        getFileUrl(currentSubmission, "screenshot_4"),
                        { editMode: false }
                    );
                    setFileControls(
                        "screenshot_5",
                        getFileUrl(currentSubmission, "screenshot_5"),
                        { editMode: false }
                    );
                    setFileControls(
                        "invoice_file",
                        getFileUrl(currentSubmission, "invoice_file"),
                        { editMode: false, btnText: "Lihat File" }
                    );
                    setFileControls(
                        "review_proof_file",
                        getFileUrl(currentSubmission, "review_proof_file"),
                        { editMode: false, btnText: "Lihat File" }
                    );

                    $("#existingNotice")?.classList.remove("d-none");
                    applyAcquisitionVisibility();
                    updateButtonsVisibility();
                    updateAddMoreBtn();

                    // TERAPKAN kunci draft per-slot (approved → tidak dikunci)
                    enforceSlotLocks();
                };

                const applyEditMode = () => {
                    // buka semua input (kecuali shipping); posts tidak mandatory
                    for (let i = 1; i <= MAX_SLOTS; i++) {
                        ["link-" + i, "post_date_" + i].forEach((id) => {
                            const el = $("#" + id);
                            if (!el) return;
                            el.disabled = false;
                            el.classList.remove("is-draft-locked");
                            el.removeAttribute("required");
                        });
                    }
                    [
                        "acquisition_method",
                        "purchase_platform",
                        "purchase_price",
                    ].forEach((id) => {
                        const el = $("#" + id);
                        if (el) {
                            el.disabled = false;
                            el.removeAttribute("required");
                        }
                    });

                    // shipping tetap disabled
                    [
                        $("#shipping_courier"),
                        $("#shipping_tracking_number"),
                    ].forEach((el) => {
                        el?.setAttribute("disabled", "disabled");
                        el?.removeAttribute("required");
                    });

                    setFileControls(
                        "screenshot_1",
                        getFileUrl(currentSubmission, "screenshot_1"),
                        { editMode: true }
                    );
                    setFileControls(
                        "screenshot_2",
                        getFileUrl(currentSubmission, "screenshot_2"),
                        { editMode: true }
                    );
                    setFileControls(
                        "screenshot_3",
                        getFileUrl(currentSubmission, "screenshot_3"),
                        { editMode: true }
                    );
                    setFileControls(
                        "screenshot_4",
                        getFileUrl(currentSubmission, "screenshot_4"),
                        { editMode: true }
                    );
                    setFileControls(
                        "screenshot_5",
                        getFileUrl(currentSubmission, "screenshot_5"),
                        { editMode: true }
                    );
                    setFileControls(
                        "invoice_file",
                        getFileUrl(currentSubmission, "invoice_file"),
                        { editMode: true, btnText: "Lihat File" }
                    );
                    setFileControls(
                        "review_proof_file",
                        getFileUrl(currentSubmission, "review_proof_file"),
                        { editMode: true, btnText: "Lihat File" }
                    );

                    $("#existingNotice")?.classList.remove("d-none");
                    applyAcquisitionVisibility();
                    updateButtonsVisibility();
                    updateAddMoreBtn();

                    // Saat edit: tetap hormati lock karena draft belum approved
                    enforceSlotLocks();
                };

                const clearSubmissionView = () => {
                    currentSubmission = null;
                    isEditing = false;
                    $("#existingNotice")?.classList.add("d-none");
                    $("#submissionForm").reset();

                    for (let i = 1; i <= MAX_SLOTS; i++) {
                        ["link-" + i, "post_date_" + i].forEach((id) => {
                            const el = $("#" + id);
                            if (!el) return;
                            el.disabled = false;
                            el.removeAttribute("required");
                        });
                    }
                    [
                        "acquisition_method",
                        "purchase_platform",
                        "purchase_price",
                    ].forEach((id) => {
                        const el = $("#" + id);
                        if (el) {
                            el.disabled = false;
                            el.removeAttribute("required");
                        }
                    });

                    // keep shipping view-only
                    [
                        $("#shipping_courier"),
                        $("#shipping_tracking_number"),
                    ].forEach((el) => {
                        el?.setAttribute("disabled", "disabled");
                        el?.removeAttribute("required");
                        if (el) el.value = "";
                    });

                    setFileControls("screenshot_1", "", { editMode: true });
                    setFileControls("screenshot_2", "", { editMode: true });
                    setFileControls("screenshot_3", "", { editMode: true });
                    setFileControls("screenshot_4", "", { editMode: true });
                    setFileControls("screenshot_5", "", { editMode: true });
                    setFileControls("invoice_file", "", { editMode: true });
                    setFileControls("review_proof_file", "", {
                        editMode: true,
                    });

                    // reset draft UI
                    draftStatusWrap?.classList.add("d-none");
                    buildDraftRows(requiredDraftCount);
                    refreshDraftUiAvailability();
                    loadDraftStatus();

                    applyAcquisitionVisibility();
                    resetSlotVisibility();

                    draftLockBySlot.clear();
                    enforceSlotLocks();

                    updateButtonsVisibility();
                };

                const enterEditMode = () => {
                    if (currentSubmission?.id) {
                        isEditing = true;
                        applyEditMode();
                    }
                };

                const exitEditMode = () => {
                    if (currentSubmission?.id) {
                        isEditing = false;
                        fillSubmissionValues(currentSubmission);
                        applyViewMode();
                    }
                };

                // API helpers
                const fetchSubmissionForCampaign = async ({
                    tiktok_user_id,
                    campaign_id,
                }) => {
                    const qs = new URLSearchParams({
                        tiktok_user_id,
                        campaign_id,
                        per_page: "1",
                        _: String(Date.now()),
                    }).toString();
                    const r = await fetch(`/api/influencer-submissions?${qs}`, {
                        headers: { Accept: "application/json" },
                        credentials: "same-origin",
                        cache: "no-store",
                    });
                    if (!r.ok) return null;
                    const json = await r.json();
                    const arr = Array.isArray(json) ? json : json?.data || [];
                    return arr[0] || null;
                };
                const fetchSubmissionById = async (id) => {
                    const r = await fetch(
                        `/api/influencer-submissions/${id}?_=${Date.now()}`,
                        {
                            headers: { Accept: "application/json" },
                            credentials: "same-origin",
                            cache: "no-store",
                        }
                    );
                    if (!r.ok) return null;
                    return await r.json();
                };

                const fetchRegsByUsername = async (uname) => {
                    if (!uname) return [];
                    const qs = new URLSearchParams({
                        tiktok_username: uname,
                        include: "campaign",
                        per_page: "50",
                        _: String(Date.now()),
                    }).toString();
                    const r = await fetch(
                        `/api/influencer-registrations?${qs}`,
                        {
                            headers: { Accept: "application/json" },
                            credentials: "same-origin",
                            cache: "no-store",
                        }
                    );
                    if (!r.ok) return [];
                    const j = await r.json();
                    return Array.isArray(j) ? j : j?.data || [];
                };

                const mergeRegsUniqueByCampaign = (a = [], b = []) => {
                    const m = new Map();
                    const push = (x) => {
                        if (!x) return;
                        const cid = x?.campaign?.id ?? x?.campaign_id ?? null;
                        if (!cid) return;
                        if (!m.has(cid)) m.set(cid, x);
                    };
                    a.forEach(push);
                    b.forEach(push);
                    return Array.from(m.values());
                };

                async function ensureQuotaForCampaign(campaignId) {
                    // hitung minimal required berdasarkan content quota (max 5)
                    const t = await getCampaignContentTarget(campaignId);
                    const minRequired = clampInt(t ?? 1, 1, MAX_SLOTS);
                    requiredPostCount = minRequired; // hanya hint / default slot; BUKAN mandatory
                    requiredDraftCount = minRequired; // draft rows ditampilkan, tapi submit minimal 1

                    buildDraftRows(requiredDraftCount);
                    applyRequiredAttributes();
                    resetSlotVisibility();
                    refreshDraftUiAvailability();
                }

                const loadSubmissionForSelected = async () => {
                    isEditing = false;
                    refreshDraftUiAvailability();

                    if (!openId || !selectedCampaignId) {
                        clearSubmissionView();
                        fillContactFields(null, {});
                        return;
                    }
                    try {
                        showLoader();

                        // Pastikan quota untuk campaign terpilih
                        await ensureQuotaForCampaign(selectedCampaignId);

                        // set currentRegistration untuk campaign ini
                        currentRegistration =
                            regsMapByCampaign.get(Number(selectedCampaignId)) ||
                            null;
                        const contactFallback = getContactFrom(
                            currentRegistration || {}
                        );
                        fillContactFields(currentRegistration, contactFallback);

                        const rec = await fetchSubmissionForCampaign({
                            tiktok_user_id: openId,
                            campaign_id: selectedCampaignId,
                        });
                        currentSubmission = rec || null;
                        if (currentSubmission) {
                            fillSubmissionValues(currentSubmission);
                            applyViewMode();
                        } else {
                            clearSubmissionView();
                        }

                        // Status draft terakhir + prefill URLs per-slot
                        await loadDraftStatus();
                    } catch (e) {
                        console.warn("fetchSubmissionForCampaign error", e);
                        clearSubmissionView();
                        refreshDraftUiAvailability();
                    } finally {
                        hideLoader();
                    }
                };

                function renderCampaignButtons(items) {
                    const listEl = $("#campaignList");
                    regsMapByCampaign = new Map();
                    if (!Array.isArray(items) || items.length === 0) {
                        listEl.innerHTML = `<div class="text-muted small">Belum ada campaign yang diikuti.</div>`;
                        setTitle("My Campaign");
                        clearSubmissionView();
                        refreshDraftUiAvailability();
                        return;
                    }

                    // build map & UI
                    listEl.innerHTML = items
                        .map((r, i) => {
                            const c = r.campaign || {};
                            const cid = c.id ?? r.campaign_id ?? "";
                            regsMapByCampaign.set(Number(cid), r);
                            const cname = safe(
                                c.name,
                                r.campaign_name || `Campaign ${i + 1}`
                            );
                            const oid = r.tiktok_user_id || "";
                            return `
            <button class="btn btn-dark text-start py-2 campaign-item ${
                i === 0 ? "active" : ""
            }"
                    data-campaign-id="${cid}" data-open-id="${oid}">
              ${cname}
            </button>
          `;
                        })
                        .join("");

                    const first = listEl.querySelector(".campaign-item");
                    if (first) {
                        selectedCampaignId =
                            first.getAttribute("data-campaign-id");
                        openId = first.getAttribute("data-open-id") || openId;
                        setTitle(first.textContent.trim());
                    }

                    listEl.querySelectorAll(".campaign-item").forEach((btn) => {
                        btn.addEventListener("click", async () => {
                            listEl
                                .querySelectorAll(".campaign-item")
                                .forEach((b) => b.classList.remove("active"));
                            btn.classList.add("active");
                            selectedCampaignId =
                                btn.getAttribute("data-campaign-id");
                            openId = btn.getAttribute("data-open-id") || openId;
                            setTitle(btn.textContent.trim());
                            refreshDraftUiAvailability();
                            await loadSubmissionForSelected();
                        });
                    });

                    refreshDraftUiAvailability();
                    loadSubmissionForSelected();
                }

                // Save Contact button
                $("#saveContactBtn")?.addEventListener("click", async () => {
                    if (!currentRegistration?.id) {
                        showToast(
                            "Registrasi untuk campaign ini tidak ditemukan.",
                            "error"
                        );
                        return;
                    }
                    const phone = $("#contact_phone").value.trim();
                    const email = $("#contact_email").value.trim();
                    const addr = $("#contact_address").value.trim();

                    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
                        showToast("Format email tidak valid.", "error");
                        return;
                    }

                    const fd = new FormData();
                    fd.set("_method", "PATCH");
                    if (phone) {
                        fd.set("phone", phone);
                        fd.set("contact_phone", phone);
                    }
                    if (email) {
                        fd.set("email", email);
                        fd.set("contact_email", email);
                    }
                    if (addr) {
                        fd.set("address", addr);
                        fd.set("alamat", addr);
                        fd.set("shipping_address", addr);
                    }

                    try {
                        showLoader();
                        let resp;
                        if (typeof influencerService?.update === "function") {
                            resp = await influencerService.update(
                                currentRegistration.id,
                                fd
                            );
                        } else {
                            const r = await fetchWithCsrf(
                                `/api/influencer-registrations/${currentRegistration.id}`,
                                {
                                    method: "POST",
                                    credentials: "same-origin",
                                    body: fd,
                                    cache: "no-store",
                                }
                            );
                            if (!r.ok)
                                throw new Error("Gagal menyimpan kontak");
                            resp = await r.json();
                        }
                        showToast(resp?.message || "Kontak berhasil disimpan");
                        // refresh reg in map (optional)
                        try {
                            const r = await fetch(
                                `/api/influencer-registrations/${
                                    currentRegistration.id
                                }?_=${Date.now()}`,
                                {
                                    headers: { Accept: "application/json" },
                                    credentials: "same-origin",
                                    cache: "no-store",
                                }
                            );
                            if (r.ok) {
                                const freshReg = await r.json();
                                regsMapByCampaign.set(
                                    Number(selectedCampaignId),
                                    freshReg
                                );
                                currentRegistration = freshReg;
                            }
                        } catch {}
                    } catch (err) {
                        showToast(
                            err.message || "Gagal menyimpan kontak",
                            "error"
                        );
                    } finally {
                        hideLoader();
                    }
                });

                // Tombol Edit/Batal
                $("#editBtn")?.addEventListener("click", enterEditMode);
                $("#cancelEditBtn")?.addEventListener("click", exitEditMode);

                // Submit handler (submission only; shipping tidak pernah dikirim dari KOL)
                const form = $("#submissionForm");
                form.addEventListener("submit", async (e) => {
                    e.preventDefault();

                    // Posts TIDAK mandatory → tidak ada pre-check jumlah posting

                    if (!form.checkValidity()) {
                        e.stopPropagation();
                        form.classList.add("was-validated");
                        return;
                    }
                    if (!openId || !selectedCampaignId) {
                        showToast("Campaign belum dipilih.", "error");
                        return;
                    }

                    const fd = new FormData();
                    fd.set("tiktok_user_id", openId);
                    fd.set("campaign_id", selectedCampaignId);

                    const forceAll = !!currentSubmission?.id;
                    const addField = (id, key = null, force = false) => {
                        const el = $("#" + id);
                        if (!el) return;
                        const name = key || id.replace(/-/g, "_");
                        if (force) {
                            if (hasVal(el.value)) fd.set(name, el.value.trim());
                        } else {
                            if (!el.disabled && hasVal(el.value))
                                fd.set(name, el.value.trim());
                        }
                    };

                    // slot 1–5
                    for (let i = 1; i <= MAX_SLOTS; i++) {
                        addField("link-" + i, "link_" + i, forceAll);
                        addField("post_date_" + i, "post_date_" + i, forceAll);
                    }

                    // acquisition (TANPA shipping)
                    addField(
                        "acquisition_method",
                        "acquisition_method",
                        forceAll
                    );
                    addField(
                        "purchase_platform",
                        "purchase_platform",
                        forceAll
                    );
                    addField("purchase_price", "purchase_price", forceAll);

                    // Files
                    const fileOf = (id) => $("#" + id)?.files?.[0];
                    const sc1 = fileOf("screenshot_1");
                    const sc2 = fileOf("screenshot_2");
                    const sc3 = fileOf("screenshot_3");
                    const sc4 = fileOf("screenshot_4");
                    const sc5 = fileOf("screenshot_5");
                    const inv = fileOf("invoice_file");
                    const rev = fileOf("review_proof_file");
                    if (sc1) fd.set("screenshot_1", sc1);
                    if (sc2) fd.set("screenshot_2", sc2);
                    if (sc3) fd.set("screenshot_3", sc3);
                    if (sc4) fd.set("screenshot_4", sc4);
                    if (sc5) fd.set("screenshot_5", sc5);
                    if (inv) fd.set("invoice_file", inv);
                    if (rev) fd.set("review_proof_file", rev);

                    try {
                        showLoader();
                        const btn = $("#submitBtn");
                        btn.disabled = true;

                        let resp;
                        if (currentSubmission?.id) {
                            fd.set("_method", "PATCH");
                            const r = await fetchWithCsrf(
                                `/api/influencer-submissions/${currentSubmission.id}`,
                                {
                                    method: "POST",
                                    credentials: "same-origin",
                                    body: fd,
                                    cache: "no-store",
                                }
                            );
                            if (!r.ok) throw new Error("Gagal update");
                            resp = await r.json();
                            showToast(
                                resp?.message || "Data berhasil diupdate"
                            );

                            const fresh = await fetchSubmissionById(
                                currentSubmission.id
                            );
                            if (fresh) {
                                currentSubmission = fresh;
                                fillSubmissionValues(currentSubmission);
                                isEditing = false;
                                applyViewMode();
                            } else {
                                await loadSubmissionForSelected();
                            }
                        } else {
                            if (
                                typeof submissionService?.create === "function"
                            ) {
                                resp = await submissionService.create(fd);
                            } else {
                                const r = await fetchWithCsrf(
                                    "/api/influencer-submissions",
                                    {
                                        method: "POST",
                                        credentials: "same-origin",
                                        body: fd,
                                    }
                                );
                                if (!r.ok) throw new Error("Gagal kirim");
                                resp = await r.json();
                            }
                            showToast(resp?.message || "Data berhasil dikirim");
                            await loadSubmissionForSelected();
                        }
                    } catch (err) {
                        showToast(err.message || "Proses gagal", "error");
                        $("#submitBtn").disabled = false;
                    } finally {
                        hideLoader();
                    }
                });

                // Preview untuk semua input file (local blob)
                [
                    "screenshot_1",
                    "screenshot_2",
                    "screenshot_3",
                    "screenshot_4",
                    "screenshot_5",
                    "invoice_file",
                    "review_proof_file",
                ].forEach(wirePreview);

                // ======== Load profile + campaigns ========
                try {
                    // 1) session /me/tiktok
                    let me = {};
                    try {
                        const res = await fetch("/me/tiktok", {
                            headers: { Accept: "application/json" },
                            credentials: "same-origin",
                            cache: "no-store",
                        });
                        if (res.ok) me = await res.json();
                    } catch {}

                    // 2) profile gabungan (session + cache)
                    const cache = readLocalProfile() || {};
                    const profile = mergeProfile(me, cache);

                    // 3) render profil
                    $("#profileName").textContent =
                        profile.tiktok_full_name || "Creator";
                    $("#profileHandle").textContent = profile.tiktok_username
                        ? "@" + profile.tiktok_username
                        : "";
                    if (profile.tiktok_avatar_url) {
                        $("#profileAvatarIcon")?.classList.add("d-none");
                        const img = $("#profileAvatarImg");
                        img.src = profile.tiktok_avatar_url;
                        img.classList.remove("d-none");
                    }

                    // 4) regs by open_id + by username → merge unik per campaign
                    let regsById = [];
                    if (profile.tiktok_user_id) {
                        const result = await influencerService.getAll({
                            tiktok_user_id: profile.tiktok_user_id,
                            include: "campaign",
                            per_page: 50,
                            _: Date.now(),
                        });
                        regsById = Array.isArray(result)
                            ? result
                            : result?.data || [];
                    }
                    const regsByUname = profile.tiktok_username
                        ? await fetchRegsByUsername(profile.tiktok_username)
                        : [];
                    const regs = mergeRegsUniqueByCampaign(
                        regsById,
                        regsByUname
                    );

                    renderCampaignButtons(regs);
                } catch (e) {
                    console.warn("Load profile/campaigns failed (merged):", e);
                    renderCampaignButtons([]);
                }

                // Init visibility
                await ensureQuotaForCampaign(selectedCampaignId || 0); // set default hints/rows
                applyAcquisitionVisibility();
                resetSlotVisibility();
                refreshDraftUiAvailability();

                // Logout
                $("#logoutBtn")?.addEventListener("click", async () => {
                    try {
                        await fetchWithCsrf("/logout", {
                            method: "POST",
                            credentials: "same-origin",
                            headers: { "X-Requested-With": "XMLHttpRequest" },
                        });
                    } catch {}
                    localStorage.removeItem("kol_profile");
                    location.assign("/");
                });
            }
        )
        .catch((err) =>
            console.error("[my-profile] Failed dynamic imports:", err)
        );
}
