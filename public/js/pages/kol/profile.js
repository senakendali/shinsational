// /js/pages/kol/my-profile.js
export function render(target, params, query = {}, labelOverride = null) {
    const v = window.BUILD_VERSION || Date.now();
    const HEADER_H = 127;

    target.innerHTML = `
    <div class="container-fluid px-0 " style="margin-top:${HEADER_H}px;">
      <div class="d-flex flex-column flex-md-row " style="min-height: calc(100vh - ${HEADER_H}px);">

        <!-- Sidebar -->
        <aside class="bg-light border-end d-flex flex-column py-4" style="flex:0 0 300px; max-width:100%;">
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
        <main class="flex-grow-1 bg-white d-flex flex-column ">
          <div class="p-4 flex-grow-1">
            <h4 class="mb-4" id="mainCampaignTitle">My Campaign</h4>

            <form id="submissionForm" class="needs-validation" novalidate>
              <div class="row g-3">

                <!-- BARIS 1: Postingan 1 (Link, Tanggal, Screenshot) -->
                <div class="col-12">
                  <div class="row g-3 align-items-end">
                    <div class="col-md-4">
                      <label for="link-1" class="form-label text-muted">Link Postingan 1</label>
                      <input type="url" class="form-control" id="link-1" placeholder="https://www.tiktok.com/..." required>
                      <div class="invalid-feedback">Link Postingan 1 wajib diisi (URL valid).</div>
                    </div>
                    <div class="col-md-4">
                      <label for="post_date_1" class="form-label text-muted">Tanggal Postingan 1</label>
                      <input type="date" class="form-control" id="post_date_1" required>
                      <div class="invalid-feedback">Tanggal Postingan 1 wajib diisi.</div>
                    </div>
                    <div class="col-md-4">
                      <label for="screenshot_1" class="form-label text-muted">Screenshot Postingan 1</label>
                      <input type="file" class="form-control" id="screenshot_1" accept="image/*">
                    </div>
                  </div>
                </div>

                <!-- BARIS 2: Postingan 2 (Link, Tanggal, Screenshot) - OPSIONAL -->
                <div class="col-12">
                  <div class="row g-3 align-items-end">
                    <div class="col-md-4">
                      <label for="link-2" class="form-label text-muted">Link Postingan 2 (Opsional)</label>
                      <input type="url" class="form-control" id="link-2" placeholder="https://www.tiktok.com/...">
                      <div class="invalid-feedback">Jika diisi, harus URL yang valid.</div>
                    </div>
                    <div class="col-md-4">
                      <label for="post_date_2" class="form-label text-muted">Tanggal Postingan 2 (Opsional)</label>
                      <input type="date" class="form-control" id="post_date_2">
                      <div class="invalid-feedback">Jika diisi, pilih tanggal yang valid.</div>
                    </div>
                    <div class="col-md-4">
                      <label for="screenshot_2" class="form-label text-muted">Screenshot Postingan 2 (Opsional)</label>
                      <input type="file" class="form-control" id="screenshot_2" accept="image/*">
                    </div>
                  </div>
                </div>

                <!-- Beli di mana -->
                <div class="col-md-6">
                  <label for="purchase_platform" class="form-label text-muted">Beli di mana</label>
                  <select id="purchase_platform" class="form-select">
                    <option value="">-- Pilih --</option>
                    <option value="tiktokshop">TikTok Shop</option>
                    <option value="shopee">Shopee</option>
                  </select>
                </div>

                <!-- Invoice & Bukti Review -->
                <div class="col-md-6">
                  <label for="invoice_file" class="form-label text-muted">Upload Invoice Pembelian</label>
                  <input type="file" class="form-control" id="invoice_file" accept="application/pdf,image/*">
                  <small class="text-muted">PDF/JPG/PNG, opsional</small>
                </div>

                <div class="col-md-6">
                  <label for="review_proof_file" class="form-label text-muted">Upload Bukti Review/Rate</label>
                  <input type="file" class="form-control" id="review_proof_file" accept="application/pdf,image/*">
                  <small class="text-muted">PDF/JPG/PNG, opsional</small>
                </div>

                <div class="col-12 pt-2 d-flex justify-content-end">
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

                const $ = (sel) => document.querySelector(sel);
                const safe = (v, d = "") => (v == null ? d : v);

                // State
                let openId = null;
                let selectedCampaignId = null;

                // UI helpers
                const disableForm = (flag) => {
                    [
                        "link-1",
                        "post_date_1",
                        "screenshot_1",
                        "link-2",
                        "post_date_2",
                        "screenshot_2",
                        "purchase_platform",
                        "invoice_file",
                        "review_proof_file",
                        "submitBtn",
                    ].forEach((id) => {
                        const el = $("#" + id);
                        if (el) el.disabled = flag;
                    });
                };
                const setTitle = (txt) => {
                    $("#mainCampaignTitle").textContent = txt || "My Campaign";
                };

                function renderCampaignButtons(items) {
                    const listEl = $("#campaignList");
                    if (!Array.isArray(items) || items.length === 0) {
                        listEl.innerHTML = `<div class="text-muted small">Belum ada campaign yang diikuti.</div>`;
                        setTitle("My Campaign");
                        disableForm(true);
                        return;
                    }

                    listEl.innerHTML = items
                        .map((r, i) => {
                            const c = r.campaign || {};
                            const cid = c.id ?? r.campaign_id ?? "";
                            const cname = safe(
                                c.name,
                                r.campaign_name || `Campaign ${i + 1}`
                            );
                            return `
            <button class="btn btn-dark text-start py-2 campaign-item ${
                i === 0 ? "active" : ""
            }" data-campaign-id="${cid}">
              ${cname}
            </button>
          `;
                        })
                        .join("");

                    // Auto-select first
                    const first = listEl.querySelector(".campaign-item");
                    if (first) {
                        selectedCampaignId =
                            first.getAttribute("data-campaign-id");
                        setTitle(first.textContent.trim());
                        disableForm(false);
                    }

                    // Click handlers
                    listEl.querySelectorAll(".campaign-item").forEach((btn) => {
                        btn.addEventListener("click", () => {
                            listEl
                                .querySelectorAll(".campaign-item")
                                .forEach((b) => b.classList.remove("active"));
                            btn.classList.add("active");
                            selectedCampaignId =
                                btn.getAttribute("data-campaign-id");
                            setTitle(btn.textContent.trim());
                            $("#submissionForm").reset();
                        });
                    });
                }

                // Validation + submit
                const form = $("#submissionForm");
                form.addEventListener("submit", async (e) => {
                    e.preventDefault();
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
                    fd.set("link_1", $("#link-1").value.trim());

                    // OPTIONAL: link_2 hanya dikirim jika diisi
                    const link2 = $("#link-2").value.trim();
                    if (link2) fd.set("link_2", link2);

                    // tanggal per link
                    const pd1 = $("#post_date_1")?.value || "";
                    const pd2 = $("#post_date_2")?.value || "";
                    if (pd1) fd.set("post_date_1", pd1);
                    if (pd2) fd.set("post_date_2", pd2);

                    // Files & dropdown
                    const sc1 = $("#screenshot_1")?.files?.[0];
                    const sc2 = $("#screenshot_2")?.files?.[0];
                    const inv = $("#invoice_file")?.files?.[0];
                    const rev = $("#review_proof_file")?.files?.[0];
                    const platform = $("#purchase_platform")?.value || "";

                    if (sc1) fd.set("screenshot_1", sc1);
                    if (sc2) fd.set("screenshot_2", sc2);
                    if (inv) fd.set("invoice_file", inv);
                    if (rev) fd.set("review_proof_file", rev);
                    if (platform) fd.set("purchase_platform", platform);

                    try {
                        showLoader();
                        $("#submitBtn").disabled = true;
                        const resp = await submissionService.create(fd);
                        showToast(resp.message || "Data berhasil dikirim");
                        form.reset();
                    } catch (err) {
                        showToast(
                            err.message || "Gagal mengirim data",
                            "error"
                        );
                    } finally {
                        $("#submitBtn").disabled = false;
                        hideLoader();
                    }
                });

                // Load profile + campaigns
                try {
                    const res = await fetch("/me/tiktok", {
                        headers: { Accept: "application/json" },
                        credentials: "same-origin",
                    });
                    if (!res.ok) throw new Error("cannot fetch session");
                    const me = await res.json();

                    openId = me.tiktok_user_id || null;
                    $("#profileName").textContent = safe(
                        me.tiktok_full_name,
                        "Creator"
                    );

                    if (me.tiktok_avatar_url) {
                        $("#profileAvatarIcon")?.classList.add("d-none");
                        const img = $("#profileAvatarImg");
                        img.src = me.tiktok_avatar_url;
                        img.classList.remove("d-none");
                    }

                    if (openId) {
                        const result = await (
                            await import(
                                `/js/services/influencerRegistrationService.js?v=${v}`
                            )
                        ).influencerService.getAll({
                            tiktok_user_id: openId,
                            include: "campaign",
                            per_page: 50,
                        });
                        const regs = Array.isArray(result)
                            ? result
                            : result.data || [];
                        renderCampaignButtons(regs);
                    } else {
                        renderCampaignButtons([]);
                    }
                } catch (e) {
                    console.warn("Load profile/campaigns failed:", e);
                    renderCampaignButtons([]);
                }
            }
        )
        .catch((err) =>
            console.error("[my-profile] Failed dynamic imports:", err)
        );
}
