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

            <!-- NEW: Notice jika sudah pernah submit -->
            <div id="existingNotice" class="alert alert-info d-none">
              Kamu sudah mengirim data untuk campaign ini. Form di bawah dalam mode lihat.
            </div>

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
                      <!-- NEW: slot tombol view -->
                      <a id="screenshot_1_view" href="#" target="_blank" class="btn btn-outline-secondary btn-sm mt-2 d-none">Lihat Gambar</a>
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
                      <!-- NEW: slot tombol view -->
                      <a id="screenshot_2_view" href="#" target="_blank" class="btn btn-outline-secondary btn-sm mt-2 d-none">Lihat Gambar</a>
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
                  <!-- NEW -->
                  <a id="invoice_file_view" href="#" target="_blank" class="btn btn-outline-secondary btn-sm mt-2 d-none">Lihat File</a>
                </div>

                <div class="col-md-6">
                  <label for="review_proof_file" class="form-label text-muted">Upload Bukti Review/Rate</label>
                  <input type="file" class="form-control" id="review_proof_file" accept="application/pdf,image/*">
                  <small class="text-muted">PDF/JPG/PNG, opsional</small>
                  <!-- NEW -->
                  <a id="review_proof_file_view" href="#" target="_blank" class="btn btn-outline-secondary btn-sm mt-2 d-none">Lihat File</a>
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
    .then(async ([headerMod, footerMod, regSvcMod, subSvcMod, loaderMod, toastMod]) => {
      const { renderHeaderKol } = headerMod;
      const { renderFooterKol } = footerMod;
      const { influencerService } = regSvcMod;
      const { submissionService } = subSvcMod;
      const { showLoader, hideLoader } = loaderMod;
      const { showToast } = toastMod;

      renderHeaderKol("header");
      renderFooterKol();

      const $ = (sel) => document.querySelector(sel);
      const safe = (v, d = '') => (v == null ? d : v);

      // State
      let openId = null;
      let selectedCampaignId = null;
      let currentSubmission = null; // NEW

      // UI helpers
      const disableForm = (flag) => {
        [
          "link-1","post_date_1","screenshot_1",
          "link-2","post_date_2","screenshot_2",
          "purchase_platform","invoice_file","review_proof_file","submitBtn"
        ].forEach(id => { const el = $("#"+id); if (el) el.disabled = flag; });
      };
      const setTitle = (txt) => { $("#mainCampaignTitle").textContent = txt || 'My Campaign'; };

      // NEW: date → yyyy-mm-dd untuk input type=date
      const toInputDate = (val) => {
        if (!val) return '';
        const d = new Date(val);
        if (isNaN(d)) return String(val).slice(0,10);
        // normalisasi offset agar tidak lompat hari
        const k = new Date(d.getTime() - d.getTimezoneOffset()*60000);
        return k.toISOString().slice(0,10);
      };

      // NEW: ambil URL file dari berbagai kemungkinan field
      const getFileUrl = (rec, key) => {
        if (!rec) return '';
        return rec[`${key}_url`] || rec[key] || '';
      };

      // NEW: toggle input file ⇄ tombol view
      const setFileViewOrInput = (inputId, url, btnText = 'Lihat File') => {
        const input = $("#"+inputId);
        const viewBtn = $("#"+inputId+"_view");
        if (!input || !viewBtn) return;

        if (url) {
          input.classList.add('d-none');
          viewBtn.href = url;
          viewBtn.textContent = btnText;
          viewBtn.classList.remove('d-none');
        } else {
          viewBtn.classList.add('d-none');
          viewBtn.removeAttribute('href');
          input.classList.remove('d-none');
          input.value = ''; // reset jika sebelumnya hidden
        }
      };

      // NEW: bersihkan form ke mode input baru
      const clearSubmissionView = () => {
        $("#existingNotice")?.classList.add('d-none');
        currentSubmission = null;
        $("#submissionForm").reset();
        disableForm(false);

        // pastikan semua input file terlihat, tombol view disembunyikan
        setFileViewOrInput('screenshot_1', '');
        setFileViewOrInput('screenshot_2', '');
        setFileViewOrInput('invoice_file', '');
        setFileViewOrInput('review_proof_file', '');
      };

      // NEW: isi form dengan submission yang ada dan kunci form (view)
      const fillSubmission = (rec) => {
        if (!rec) return clearSubmissionView();
        currentSubmission = rec;

        $("#link-1").value = safe(rec.link_1, '');
        $("#link-2").value = safe(rec.link_2, '');
        $("#post_date_1").value = toInputDate(rec.post_date_1);
        $("#post_date_2").value = toInputDate(rec.post_date_2);
        $("#purchase_platform").value = safe(rec.purchase_platform, '');

        setFileViewOrInput('screenshot_1', getFileUrl(rec, 'screenshot_1'), 'Lihat Gambar');
        setFileViewOrInput('screenshot_2', getFileUrl(rec, 'screenshot_2'), 'Lihat Gambar');
        setFileViewOrInput('invoice_file',  getFileUrl(rec, 'invoice_file'),  'Lihat File');
        setFileViewOrInput('review_proof_file', getFileUrl(rec, 'review_proof_file'), 'Lihat File');

        // kunci form (view-only)
        disableForm(true);
        // tapi izinkan pindah campaign, jadi cuma tombol submit yang dimatikan
        $("#submitBtn").disabled = true;

        $("#existingNotice")?.classList.remove('d-none');
      };

      // NEW: ambil submission berdasarkan user+campaign
      const fetchSubmissionForCampaign = async ({ tiktok_user_id, campaign_id }) => {
        // Coba lewat service kalau ada method pencarian/list
        if (submissionService?.list) {
          const res = await submissionService.list({
            tiktok_user_id,
            campaign_id,
            per_page: 1,
          });
          const arr = Array.isArray(res) ? res : (res?.data || []);
          return arr[0] || null;
        }

        // Fallback pakai fetch langsung
        const qs = new URLSearchParams({
          tiktok_user_id,
          campaign_id,
          per_page: '1',
        }).toString();

        const r = await fetch(`/api/influencer-submissions?${qs}`, {
          headers: { 'Accept': 'application/json' },
          credentials: 'same-origin'
        });
        if (!r.ok) return null;
        const json = await r.json();
        const arr = Array.isArray(json) ? json : (json?.data || []);
        return arr[0] || null;
      };

      // NEW: load submission ketika campaign dipilih
      const loadSubmissionForSelected = async () => {
        if (!openId || !selectedCampaignId) {
          clearSubmissionView();
          return;
        }
        try {
          showLoader();
          const rec = await fetchSubmissionForCampaign({
            tiktok_user_id: openId,
            campaign_id: selectedCampaignId
          });
          if (rec) fillSubmission(rec);
          else clearSubmissionView();
        } catch (e) {
          console.warn('fetchSubmissionForCampaign error', e);
          clearSubmissionView();
        } finally {
          hideLoader();
        }
      };

      function renderCampaignButtons(items) {
        const listEl = $("#campaignList");
        if (!Array.isArray(items) || items.length === 0) {
          listEl.innerHTML = `<div class="text-muted small">Belum ada campaign yang diikuti.</div>`;
          setTitle('My Campaign');
          disableForm(true);
          return;
        }

        listEl.innerHTML = items.map((r, i) => {
          const c = r.campaign || {};
          const cid = c.id ?? r.campaign_id ?? '';
          const cname = safe(c.name, r.campaign_name || `Campaign ${i + 1}`);
          return `
            <button class="btn btn-dark text-start py-2 campaign-item ${i===0?'active':''}" data-campaign-id="${cid}">
              ${cname}
            </button>
          `;
        }).join('');

        // Auto-select first
        const first = listEl.querySelector('.campaign-item');
        if (first) {
          selectedCampaignId = first.getAttribute('data-campaign-id');
          setTitle(first.textContent.trim());
          disableForm(false);
        }

        // Click handlers
        listEl.querySelectorAll('.campaign-item').forEach(btn => {
          btn.addEventListener('click', async () => {
            listEl.querySelectorAll('.campaign-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedCampaignId = btn.getAttribute('data-campaign-id');
            setTitle(btn.textContent.trim());
            await loadSubmissionForSelected(); // NEW: load data submission campaign terpilih
          });
        });

        // NEW: load submission untuk campaign pertama
        loadSubmissionForSelected();
      }

      // Validation + submit (tetap sama, auto-create kalau belum ada data)
      const form = $("#submissionForm");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!form.checkValidity()) {
          e.stopPropagation();
          form.classList.add("was-validated");
          return;
        }
        if (!openId || !selectedCampaignId) {
          showToast('Campaign belum dipilih.', 'error');
          return;
        }

        // Kalau sudah ada submission, kita lock sebagai view-only (submit dimatikan)
        if (currentSubmission) {
          showToast('Data sudah ada untuk campaign ini. Hubungi admin jika ingin mengubah.', 'warning');
          return;
        }

        const fd = new FormData();
        fd.set('tiktok_user_id', openId);
        fd.set('campaign_id', selectedCampaignId);
        fd.set('link_1', $("#link-1").value.trim());

        const link2 = $("#link-2").value.trim();
        if (link2) fd.set('link_2', link2);

        const pd1 = $("#post_date_1")?.value || '';
        const pd2 = $("#post_date_2")?.value || '';
        if (pd1) fd.set('post_date_1', pd1);
        if (pd2) fd.set('post_date_2', pd2);

        const sc1 = $("#screenshot_1")?.files?.[0];
        const sc2 = $("#screenshot_2")?.files?.[0];
        const inv = $("#invoice_file")?.files?.[0];
        const rev = $("#review_proof_file")?.files?.[0];
        const platform = $("#purchase_platform")?.value || '';

        if (sc1) fd.set('screenshot_1', sc1);
        if (sc2) fd.set('screenshot_2', sc2);
        if (inv) fd.set('invoice_file', inv);
        if (rev) fd.set('review_proof_file', rev);
        if (platform) fd.set('purchase_platform', platform);

        try {
          showLoader();
          $("#submitBtn").disabled = true;
          const resp = await submissionService.create(fd);
          showToast(resp.message || 'Data berhasil dikirim');

          // Setelah submit sukses, ambil lagi & tampilkan sebagai view
          await loadSubmissionForSelected();
        } catch (err) {
          showToast(err.message || 'Gagal mengirim data', 'error');
          $("#submitBtn").disabled = false;
        } finally {
          hideLoader();
        }
      });

      // Load profile + campaigns (tetap)
      try {
        const res = await fetch('/me/tiktok', { headers: { 'Accept':'application/json' }, credentials: 'same-origin' });
        if (!res.ok) throw new Error('cannot fetch session');
        const me = await res.json();

        openId = me.tiktok_user_id || null;
        $("#profileName").textContent = safe(me.tiktok_full_name, 'Creator');

        if (me.tiktok_avatar_url) {
          $("#profileAvatarIcon")?.classList.add('d-none');
          const img = $("#profileAvatarImg");
          img.src = me.tiktok_avatar_url;
          img.classList.remove('d-none');
        }

        if (openId) {
          const result = await (await import(`/js/services/influencerRegistrationService.js?v=${v}`)).influencerService.getAll({
            tiktok_user_id: openId,
            include: 'campaign',
            per_page: 50,
          });
          const regs = Array.isArray(result) ? result : (result.data || []);
          renderCampaignButtons(regs);
        } else {
          renderCampaignButtons([]);
        }
      } catch (e) {
        console.warn('Load profile/campaigns failed:', e);
        renderCampaignButtons([]);
      }
    })
    .catch((err) => console.error('[my-profile] Failed dynamic imports:', err));
}
