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

            <div id="existingNotice" class="alert alert-info d-none">
              Kamu sudah pernah mengirim data untuk campaign ini. Field yang sudah terisi dikunci.
              Klik <strong>Edit</strong> untuk mengganti, atau lengkapi bagian yang belum lengkap lalu tekan <strong>Update</strong>.
            </div>

            <form id="submissionForm" class="needs-validation" novalidate>
              <div class="row g-3">

                <!-- BARIS 1 -->
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
                      <a id="screenshot_1_view" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-sm mt-2 d-none">Lihat Gambar</a>
                    </div>
                  </div>
                </div>

                <!-- BARIS 2 (opsional) -->
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
                      <a id="screenshot_2_view" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-sm mt-2 d-none">Lihat Gambar</a>
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
    .then(async ([headerMod, footerMod, regSvcMod, subSvcMod, loaderMod, toastMod]) => {
      const { renderHeaderKol } = headerMod;
      const { renderFooterKol } = footerMod;
      const { influencerService } = regSvcMod;
      const { submissionService } = subSvcMod;
      const { showLoader, hideLoader } = loaderMod;
      const { showToast } = toastMod;

      renderHeaderKol("header");
      renderFooterKol();

      // ===== Helpers
      const $ = (sel) => document.querySelector(sel);
      const safe = (v, d = '') => (v == null ? d : v);
      const hasVal = (v) => v !== undefined && v !== null && String(v).trim() !== '';
      const toInputDate = (val) => {
        if (!val) return '';
        const d = new Date(val);
        if (isNaN(d)) return String(val).slice(0,10);
        const k = new Date(d.getTime() - d.getTimezoneOffset()*60000);
        return k.toISOString().slice(0,10);
      };

      // Map path 'public' → URL klikable
      const toPublicUrl = (raw) => {
        if (!hasVal(raw)) return '';
        const s = String(raw);
        if (/^(https?:)?\/\//i.test(s) || /^blob:|^data:/i.test(s)) return s;
        let path = s.replace(/^\/+/, '');
        if (!/^storage\//i.test(path)) path = `storage/${path}`;
        return `${location.origin}/${path}`;
      };

      // Ambil URL file dari berbagai kemungkinan key
      const getFileUrl = (rec, key) => {
        if (!rec) return '';
        const candidates = [
          `${key}_url`, `${key}`,
          key.replace('_',''),           // screenshot1
          `${key}Url`, `${key}URL`,
          `${key}_path`, `${key}Path`,
        ];
        for (const k of candidates) {
          if (hasVal(rec?.[k])) return toPublicUrl(rec[k]);
        }
        if (rec?.files && hasVal(rec.files[key])) return toPublicUrl(rec.files[key]);
        return '';
      };

      // mode view vs edit untuk file controls
      const setFileControls = (inputId, remoteUrl, { editMode = false, btnText = 'Lihat File' } = {}) => {
        const input = $("#"+inputId);
        const viewBtn = $("#"+inputId+"_view");
        if (!input || !viewBtn) return;

        if (hasVal(remoteUrl)) {
          viewBtn.href = remoteUrl;
          viewBtn.textContent = inputId.includes('screenshot') ? 'Lihat Gambar' : btnText;
          viewBtn.classList.remove('d-none');
          viewBtn.dataset.remote = '1';
        } else {
          viewBtn.classList.add('d-none');
          viewBtn.removeAttribute('href');
          delete viewBtn.dataset.remote;
        }

        if (editMode) {
          input.classList.remove('d-none');
        } else {
          if (hasVal(remoteUrl)) input.classList.add('d-none');
          else input.classList.remove('d-none');
        }

        if (input.classList.contains('d-none')) input.value = '';
      };

      // Preview lokal saat pilih file
      const wirePreview = (inputId) => {
        const input = $("#"+inputId);
        const viewBtn = $("#"+inputId+"_view");
        if (!input || !viewBtn) return;

        input.addEventListener('change', () => {
          const f = input.files?.[0];
          if (f) {
            const blobUrl = URL.createObjectURL(f);
            viewBtn.href = blobUrl;
            viewBtn.textContent = inputId.includes('screenshot') ? 'Preview Gambar' : 'Preview File';
            viewBtn.classList.remove('d-none');
            viewBtn.dataset.remote = '0';
          } else {
            if (viewBtn.dataset.remote !== '1') {
              viewBtn.classList.add('d-none');
              viewBtn.removeAttribute('href');
            }
          }
        });
      };

      // ===== State
      let openId = null;
      let selectedCampaignId = null;
      let currentSubmission = null;
      let isEditing = false;

      // ===== UI helpers
      const setTitle = (txt) => { $("#mainCampaignTitle").textContent = txt || 'My Campaign'; };
      const isComplete = (rec) => hasVal(rec?.link_1) && hasVal(rec?.post_date_1);

      const updateButtonsVisibility = () => {
        const hasRecord = !!currentSubmission?.id;
        const editBtn = $("#editBtn");
        const cancelBtn = $("#cancelEditBtn");
        const submitBtn = $("#submitBtn");

        if (!hasRecord) {
          editBtn.classList.add('d-none');
          cancelBtn.classList.add('d-none');
          submitBtn.textContent = 'Kirim';
          submitBtn.disabled = false;
          return;
        }

        if (isEditing) {
          editBtn.classList.add('d-none');
          cancelBtn.classList.remove('d-none');
          submitBtn.textContent = 'Simpan Perubahan';
          submitBtn.disabled = false;
        } else {
          editBtn.classList.remove('d-none');
          cancelBtn.classList.add('d-none');
          submitBtn.textContent = isComplete(currentSubmission) ? 'Update' : 'Lengkapi & Update';
          submitBtn.disabled = false;
        }
      };

      const fillSubmissionValues = (rec) => {
        $("#link-1").value = safe(rec.link_1, '');
        $("#link-2").value = safe(rec.link_2, '');
        $("#post_date_1").value = toInputDate(rec.post_date_1);
        $("#post_date_2").value = toInputDate(rec.post_date_2);
        $("#purchase_platform").value = safe(rec.purchase_platform, '');
      };

      const applyViewMode = () => {
        const controls = [
          { id: 'link-1',              key: 'link_1',            required: true  },
          { id: 'post_date_1',         key: 'post_date_1',       required: true  },
          { id: 'link-2',              key: 'link_2',            required: false },
          { id: 'post_date_2',         key: 'post_date_2',       required: false },
          { id: 'purchase_platform',   key: 'purchase_platform', required: false },
        ];
        controls.forEach(({ id, key, required }) => {
          const el = $("#"+id);
          if (!el) return;
          const filled = hasVal(currentSubmission?.[key]);
          el.disabled = filled;
          if (!filled && required) el.setAttribute('required','required');
          else el.removeAttribute('required');
        });

        setFileControls('screenshot_1',     getFileUrl(currentSubmission, 'screenshot_1'),     { editMode: false });
        setFileControls('screenshot_2',     getFileUrl(currentSubmission, 'screenshot_2'),     { editMode: false });
        setFileControls('invoice_file',     getFileUrl(currentSubmission, 'invoice_file'),     { editMode: false, btnText: 'Lihat File' });
        setFileControls('review_proof_file',getFileUrl(currentSubmission, 'review_proof_file'),{ editMode: false, btnText: 'Lihat File' });

        $("#existingNotice")?.classList.remove('d-none');
        updateButtonsVisibility();
      };

      const applyEditMode = () => {
        ['link-1','post_date_1','link-2','post_date_2','purchase_platform'].forEach(id => {
          const el = $("#"+id);
          if (!el) return;
          el.disabled = false;
          if (id === 'link-1' || id === 'post_date_1') el.setAttribute('required','required');
          else el.removeAttribute('required');
        });

        setFileControls('screenshot_1',     getFileUrl(currentSubmission, 'screenshot_1'),     { editMode: true });
        setFileControls('screenshot_2',     getFileUrl(currentSubmission, 'screenshot_2'),     { editMode: true });
        setFileControls('invoice_file',     getFileUrl(currentSubmission, 'invoice_file'),     { editMode: true, btnText: 'Lihat File' });
        setFileControls('review_proof_file',getFileUrl(currentSubmission, 'review_proof_file'),{ editMode: true, btnText: 'Lihat File' });

        $("#existingNotice")?.classList.remove('d-none');
        updateButtonsVisibility();
      };

      const clearSubmissionView = () => {
        currentSubmission = null;
        isEditing = false;

        $("#existingNotice")?.classList.add('d-none');
        $("#submissionForm").reset();

        ['link-1','post_date_1','link-2','post_date_2','purchase_platform'].forEach(id => {
          const el = $("#"+id);
          if (!el) return;
          el.disabled = false;
          if (id === 'link-1' || id === 'post_date_1') el.setAttribute('required','required');
          else el.removeAttribute('required');
        });

        setFileControls('screenshot_1', '', { editMode: true });
        setFileControls('screenshot_2', '', { editMode: true });
        setFileControls('invoice_file', '', { editMode: true });
        setFileControls('review_proof_file', '', { editMode: true });

        updateButtonsVisibility();
      };

      const enterEditMode = () => {
        if (!currentSubmission?.id) return;
        isEditing = true;
        applyEditMode();
      };

      const exitEditMode = () => {
        if (!currentSubmission?.id) return;
        isEditing = false;
        fillSubmissionValues(currentSubmission);
        applyViewMode();
      };

      // API: fetch existing submission (cache-busted)
      const fetchSubmissionForCampaign = async ({ tiktok_user_id, campaign_id }) => {
        const qs = new URLSearchParams({
          tiktok_user_id,
          campaign_id,
          per_page: '1',
          _: String(Date.now()) // cache bust
        }).toString();

        const r = await fetch(`/api/influencer-submissions?${qs}`, {
          headers: { 'Accept':'application/json' },
          credentials: 'same-origin',
          cache: 'no-store'
        });
        if (!r.ok) return null;

        const json = await r.json();
        const arr = Array.isArray(json) ? json : (json?.data || []);
        return arr[0] || null;
      };

      const loadSubmissionForSelected = async () => {
        isEditing = false;
        if (!openId || !selectedCampaignId) { clearSubmissionView(); return; }
        try {
          showLoader();
          const rec = await fetchSubmissionForCampaign({ tiktok_user_id: openId, campaign_id: selectedCampaignId });
          currentSubmission = rec || null;

          if (currentSubmission) {
            fillSubmissionValues(currentSubmission);
            applyViewMode();
          } else {
            clearSubmissionView();
          }
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
          clearSubmissionView();
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

        const first = listEl.querySelector('.campaign-item');
        if (first) {
          selectedCampaignId = first.getAttribute('data-campaign-id');
          setTitle(first.textContent.trim());
        }

        listEl.querySelectorAll('.campaign-item').forEach(btn => {
          btn.addEventListener('click', async () => {
            listEl.querySelectorAll('.campaign-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedCampaignId = btn.getAttribute('data-campaign-id');
            setTitle(btn.textContent.trim());
            await loadSubmissionForSelected();
          });
        });

        loadSubmissionForSelected();
      }

      // Tombol Edit/Batal
      $("#editBtn")?.addEventListener('click', enterEditMode);
      $("#cancelEditBtn")?.addEventListener('click', exitEditMode);

      // Submit handler (CREATE atau UPDATE dgn PATCH)
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

        const fd = new FormData();
        fd.set('tiktok_user_id', openId);
        fd.set('campaign_id', selectedCampaignId);

        // Kumpulkan field: di edit mode kirim SEMUA yang punya nilai; di view mode hanya yang enabled
        const addField = (id, key = null, { force = false } = {}) => {
          const el = $("#"+id);
          if (!el) return;
          if (force) {
            if (hasVal(el.value)) fd.set(key || id.replace(/-/g,'_'), el.value.trim());
          } else {
            if (!el.disabled && hasVal(el.value)) fd.set(key || id.replace(/-/g,'_'), el.value.trim());
          }
        };
        const forceAll = isEditing; // kirim semua saat edit mode
        addField('link-1', 'link_1', { force: forceAll });
        addField('post_date_1', 'post_date_1', { force: forceAll });
        addField('link-2', 'link_2', { force: forceAll });
        addField('post_date_2', 'post_date_2', { force: forceAll });
        addField('purchase_platform', 'purchase_platform', { force: forceAll });

        const sc1 = $("#screenshot_1")?.files?.[0];
        const sc2 = $("#screenshot_2")?.files?.[0];
        const inv = $("#invoice_file")?.files?.[0];
        const rev = $("#review_proof_file")?.files?.[0];
        if (sc1) fd.set('screenshot_1', sc1);
        if (sc2) fd.set('screenshot_2', sc2);
        if (inv) fd.set('invoice_file', inv);
        if (rev) fd.set('review_proof_file', rev);

        try {
          showLoader();
          const btn = $("#submitBtn");
          btn.disabled = true;

          let resp;
          if (currentSubmission?.id) {
            // UPDATE via PATCH
            const r = await fetch(`/api/influencer-submissions/${currentSubmission.id}`, {
              method: 'PATCH',
              credentials: 'same-origin',
              body: fd,
              cache: 'no-store'
            });
            if (!r.ok) throw new Error('Gagal update');
            resp = await r.json();
            showToast(resp?.message || 'Data berhasil diupdate');

            // Pakai data respon kalau ada (lebih fresh), lalu refresh dari server (cache-busted)
            if (resp?.data) {
              currentSubmission = resp.data;
              fillSubmissionValues(currentSubmission);
              applyViewMode();
            }
            await loadSubmissionForSelected();
          } else {
            // CREATE
            if (typeof submissionService?.create === 'function') {
              resp = await submissionService.create(fd);
            } else {
              const r = await fetch('/api/influencer-submissions', {
                method: 'POST',
                credentials: 'same-origin',
                body: fd
              });
              if (!r.ok) throw new Error('Gagal kirim');
              resp = await r.json();
            }
            showToast(resp?.message || 'Data berhasil dikirim');
            await loadSubmissionForSelected();
          }
        } catch (err) {
          showToast(err.message || 'Proses gagal', 'error');
          $("#submitBtn").disabled = false;
        } finally {
          hideLoader();
        }
      });

      // Daftarkan preview untuk semua input file (sekali di awal)
      ['screenshot_1','screenshot_2','invoice_file','review_proof_file'].forEach(wirePreview);

      // Load profile + campaigns
      try {
        const res = await fetch('/me/tiktok', { headers: { 'Accept':'application/json' }, credentials: 'same-origin' });
        if (!res.ok) throw new Error('cannot fetch session');
        const me = await res.json();

        openId = me.tiktok_user_id || null;
        $("#profileName").textContent = safe(me.tiktok_full_name, 'Creator');
        $("#profileHandle").textContent = safe(me.tiktok_username ? '@'+me.tiktok_username : '', '');

        if (me.tiktok_avatar_url) {
          $("#profileAvatarIcon")?.classList.add('d-none');
          const img = $("#profileAvatarImg");
          img.src = me.tiktok_avatar_url;
          img.classList.remove('d-none');
        }

        if (openId) {
          const result = await influencerService.getAll({
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
