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

            <!-- ===== Kontak KOL ===== -->
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
                <div class="col-12">
                  <button type="button" id="addMoreBtn" class="btn btn-outline-dark btn-sm">
                    + Tambah Postingan
                  </button>
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

      const normalizeHandle = (val) => (val || '').toString().trim().replace(/^@+/, '');
      const makePseudoId = (handle) => {
        const h = normalizeHandle(handle).toLowerCase();
        return h ? `pseudo_${h}` : '';
      };
      const readLocalProfile = () => {
        try { return JSON.parse(localStorage.getItem('kol_profile') || 'null'); } catch { return null; }
      };
      const mergeProfile = (me = {}, cache = {}) => {
        const username = me.tiktok_username || cache?.tiktok_username || '';
        const openId   = me.tiktok_user_id  || cache?.tiktok_user_id  || makePseudoId(username);
        return {
          tiktok_full_name:  me.tiktok_full_name  || cache?.full_name || 'Creator',
          tiktok_username:   normalizeHandle(username),
          tiktok_avatar_url: me.tiktok_avatar_url || cache?.profile_pic_url || '',
          tiktok_user_id:    openId,
        };
      };

      // file viewer helpers
      const toFileUrl = (input) => {
        if (!hasVal(input)) return '';
        const origin = location.origin;
        let raw = String(input).trim();
        if (/^(blob:|data:|https?:\/\/)/i.test(raw)) {
          try {
            const u = new URL(raw);
            if (u.origin === origin) {
              if (/^\/?files/i.test(u.pathname)) return raw;
              if (/^\/?storage\//i.test(u.pathname)) {
                const stripped = u.pathname.replace(/^\/?storage\/+/i, '');
                return `${origin}/files?p=${encodeURIComponent(stripped)}`;
              }
            }
            return raw;
          } catch { return raw; }
        }
        if (/^\/?files\?/i.test(raw)) return `${origin}/${raw.replace(/^\/+/, '')}`;
        const normalized = raw.replace(/^\/+/, '').replace(/^storage\/+/i, '');
        return `${origin}/files?p=${encodeURIComponent(normalized)}`;
      };
      const getFileUrl = (rec, key) => {
        if (!rec) return '';
        const candidates = [
          `${key}_url`, `${key}`,
          key.replace('_',''),
          `${key}Url`, `${key}URL`,
          `${key}_path`, `${key}Path`,
        ];
        for (const k of candidates) {
          if (hasVal(rec?.[k])) return toFileUrl(rec[k]);
        }
        if (rec?.files && hasVal(rec.files[key])) return toFileUrl(rec.files[key]);
        return '';
      };
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
        if (editMode) input.classList.remove('d-none');
        else {
          if (hasVal(remoteUrl)) input.classList.add('d-none');
          else input.classList.remove('d-none');
        }
        if (input.classList.contains('d-none')) input.value = '';
      };
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

      // Registrations per campaign
      let regsMapByCampaign = new Map(); // campaign_id -> registration record
      let currentRegistration = null;

      // ===== Multi-slot posts
      const MAX_SLOTS = 5;
      let visibleSlots = 2;
      const slotRow = (i) => document.querySelector(`#row-slot-${i}`);
      const showSlot = (i) => { const row = slotRow(i); if (row) row.classList.remove('d-none'); if (visibleSlots < i) visibleSlots = i; updateAddMoreBtn(); };
      const hideSlot = (i) => { const row = slotRow(i); if (row) row.classList.add('d-none'); };
      const updateAddMoreBtn = () => { const btn = $("#addMoreBtn"); if (!btn) return; btn.classList.toggle('d-none', visibleSlots >= MAX_SLOTS); };
      const revealNextSlot = () => { if (visibleSlots < MAX_SLOTS) showSlot(visibleSlots + 1); };
      $("#addMoreBtn")?.addEventListener('click', revealNextSlot);
      const slotHasData = (rec, i) => {
        const has = (k) => rec && rec[k] != null && String(rec[k]).trim() !== '';
        return has(`link_${i}`) || has(`post_date_${i}`) || has(`screenshot_${i}_url`) || has(`screenshot_${i}_path`);
      };
      const resetSlotVisibility = () => { visibleSlots = 2; for (let i = 3; i <= MAX_SLOTS; i++) hideSlot(i); updateAddMoreBtn(); };

      // ===== UI helpers
      const setTitle = (txt) => { $("#mainCampaignTitle").textContent = txt || 'My Campaign'; };
      const isComplete = (rec) => hasVal(rec?.link_1) && hasVal(rec?.post_date_1);

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
        const showBuy = mode === 'buy';
        const showShip = mode === 'sent_by_brand';
        const hasInvoiceRemote = !!getFileUrl(currentSubmission, 'invoice_file');

        // Purchase
        purchaseWrap.classList.toggle('d-none', !showBuy);
        [purchasePlatformEl, purchasePriceEl].forEach(el => {
          if (!el) return;
          if (showBuy) { el.removeAttribute('disabled'); el.setAttribute('required','required'); }
          else { el.setAttribute('disabled','disabled'); el.removeAttribute('required'); el.value = ''; }
        });

        // Invoice visibility with BUY
        if (invoiceCol) invoiceCol.classList.toggle('d-none', !showBuy);
        if (invoiceEl) {
          if (showBuy) { invoiceEl.removeAttribute('disabled'); if (!hasInvoiceRemote) invoiceEl.setAttribute('required','required'); else invoiceEl.removeAttribute('required'); }
          else {
            invoiceEl.setAttribute('disabled','disabled');
            invoiceEl.removeAttribute('required'); invoiceEl.value = '';
            if (invoiceView) { invoiceView.classList.add('d-none'); invoiceView.removeAttribute('href'); delete invoiceView.dataset.remote; }
          }
        }

        // Shipping VIEW-ONLY (never editable)
        shippingWrap.classList.toggle('d-none', !showShip);
        [shippingCourierEl, shippingResiEl].forEach(el => {
          if (!el) return;
          el.setAttribute('disabled','disabled');
          el.removeAttribute('required');
        });
      };
      acquisitionEl.addEventListener('change', applyAcquisitionVisibility);

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
        for (let i = 3; i <= MAX_SLOTS; i++) {
          $("#link-"+i).value = safe(rec[`link_${i}`], '');
          $("#post_date_"+i).value = toInputDate(rec[`post_date_${i}`]);
        }
        $("#acquisition_method").value         = safe(rec.acquisition_method, '');
        $("#purchase_platform").value          = safe(rec.purchase_platform, '');
        $("#purchase_price").value             = safe(rec.purchase_price, '');
        $("#shipping_courier").value           = safe(rec.shipping_courier, '');
        $("#shipping_tracking_number").value   = safe(rec.shipping_tracking_number, '');

        resetSlotVisibility();
        for (let i = 3; i <= MAX_SLOTS; i++) if (slotHasData(rec, i)) showSlot(i);
        updateAddMoreBtn();

        applyAcquisitionVisibility();
      };

      // Contact helpers
      const pickFirst = (obj, keys = []) => {
        if (!obj) return '';
        for (const k of keys) if (Object.prototype.hasOwnProperty.call(obj, k) && hasVal(obj[k])) return String(obj[k]);
        return '';
      };
      const getContactFrom = (rec) => {
        // Try typical keys
        const phone = pickFirst(rec, ['phone','phone_number','whatsapp','wa','mobile','telp','no_hp','contact_phone']);
        const email = pickFirst(rec, ['email','contact_email','kol_email']);
        const addr  = pickFirst(rec, ['address','alamat','street_address','shipping_address','domicile','address_line','full_address']);
        return { phone, email, addr };
      };
      const fillContactFields = (reg, fallback = {}) => {
        const fromReg = getContactFrom(reg || {});
        const phone = fromReg.phone || fallback.phone || '';
        const email = fromReg.email || fallback.email || '';
        const addr  = fromReg.addr  || fallback.addr  || '';
        contactPhoneEl.value = phone;
        contactEmailEl.value = email;
        contactAddressEl.value = addr;
      };

      const applyViewMode = () => {
        const controls = [
          // slots 1–5
          { id: 'link-1',  key: 'link_1',  required: true  },
          { id: 'post_date_1', key: 'post_date_1', required: true  },
          { id: 'link-2',  key: 'link_2',  required: false },
          { id: 'post_date_2', key: 'post_date_2', required: false },
          { id: 'link-3',  key: 'link_3',  required: false },
          { id: 'post_date_3', key: 'post_date_3', required: false },
          { id: 'link-4',  key: 'link_4',  required: false },
          { id: 'post_date_4', key: 'post_date_4', required: false },
          { id: 'link-5',  key: 'link_5',  required: false },
          { id: 'post_date_5', key: 'post_date_5', required: false },
          // acquisition (shipping tetap view-only)
          { id: 'acquisition_method', key: 'acquisition_method', required: false },
          { id: 'purchase_platform',  key: 'purchase_platform',  required: false },
          { id: 'purchase_price',     key: 'purchase_price',     required: false },
        ];
        controls.forEach(({ id, key, required }) => {
          const el = $("#"+id);
          if (!el) return;
          const filled = hasVal(currentSubmission?.[key]);
          el.disabled = filled;
          if (!filled && required) el.setAttribute('required','required'); else el.removeAttribute('required');
        });

        // shipping inputs ALWAYS disabled (view-only)
        [shippingCourierEl, shippingResiEl].forEach(el => { el?.setAttribute('disabled','disabled'); el?.removeAttribute('required'); });

        // file controls
        setFileControls('screenshot_1', getFileUrl(currentSubmission, 'screenshot_1'), { editMode: false });
        setFileControls('screenshot_2', getFileUrl(currentSubmission, 'screenshot_2'), { editMode: false });
        setFileControls('screenshot_3', getFileUrl(currentSubmission, 'screenshot_3'), { editMode: false });
        setFileControls('screenshot_4', getFileUrl(currentSubmission, 'screenshot_4'), { editMode: false });
        setFileControls('screenshot_5', getFileUrl(currentSubmission, 'screenshot_5'), { editMode: false });
        setFileControls('invoice_file',  getFileUrl(currentSubmission, 'invoice_file'),  { editMode: false, btnText: 'Lihat File' });
        setFileControls('review_proof_file', getFileUrl(currentSubmission, 'review_proof_file'), { editMode: false, btnText: 'Lihat File' });

        $("#existingNotice")?.classList.remove('d-none');
        applyAcquisitionVisibility();
        updateButtonsVisibility();
        updateAddMoreBtn();
      };

      const applyEditMode = () => {
        [
          // slots 1–5
          'link-1','post_date_1','link-2','post_date_2',
          'link-3','post_date_3','link-4','post_date_4','link-5','post_date_5',
          // acquisition (shipping tetap tidak diedit)
          'acquisition_method','purchase_platform','purchase_price'
        ].forEach(id => {
          const el = $("#"+id);
          if (!el) return;
          el.disabled = false;
          if (id === 'link-1' || id === 'post_date_1') el.setAttribute('required','required');
          else el.removeAttribute('required');
        });

        // shipping: tetap disabled (view-only)
        [shippingCourierEl, shippingResiEl].forEach(el => { el?.setAttribute('disabled','disabled'); el?.removeAttribute('required'); });

        setFileControls('screenshot_1', getFileUrl(currentSubmission, 'screenshot_1'), { editMode: true });
        setFileControls('screenshot_2', getFileUrl(currentSubmission, 'screenshot_2'), { editMode: true });
        setFileControls('screenshot_3', getFileUrl(currentSubmission, 'screenshot_3'), { editMode: true });
        setFileControls('screenshot_4', getFileUrl(currentSubmission, 'screenshot_4'), { editMode: true });
        setFileControls('screenshot_5', getFileUrl(currentSubmission, 'screenshot_5'), { editMode: true });
        setFileControls('invoice_file',  getFileUrl(currentSubmission, 'invoice_file'),  { editMode: true, btnText: 'Lihat File' });
        setFileControls('review_proof_file', getFileUrl(currentSubmission, 'review_proof_file'), { editMode: true, btnText: 'Lihat File' });

        $("#existingNotice")?.classList.remove('d-none');
        applyAcquisitionVisibility();
        updateButtonsVisibility();
        updateAddMoreBtn();
      };

      const clearSubmissionView = () => {
        currentSubmission = null;
        isEditing = false;
        $("#existingNotice")?.classList.add('d-none');
        $("#submissionForm").reset();

        [
          'link-1','post_date_1','link-2','post_date_2',
          'link-3','post_date_3','link-4','post_date_4','link-5','post_date_5',
          'acquisition_method','purchase_platform','purchase_price'
        ].forEach(id => {
          const el = $("#"+id);
          if (!el) return;
          el.disabled = false;
          if (id === 'link-1' || id === 'post_date_1') el.setAttribute('required','required');
          else el.removeAttribute('required');
        });

        // keep shipping view-only
        [shippingCourierEl, shippingResiEl].forEach(el => { el?.setAttribute('disabled','disabled'); el?.removeAttribute('required'); el.value=''; });

        setFileControls('screenshot_1', '', { editMode: true });
        setFileControls('screenshot_2', '', { editMode: true });
        setFileControls('screenshot_3', '', { editMode: true });
        setFileControls('screenshot_4', '', { editMode: true });
        setFileControls('screenshot_5', '', { editMode: true });
        setFileControls('invoice_file', '', { editMode: true });
        setFileControls('review_proof_file', '', { editMode: true });

        applyAcquisitionVisibility();
        resetSlotVisibility();
        updateButtonsVisibility();
      };

      const enterEditMode = () => { if (currentSubmission?.id) { isEditing = true; applyEditMode(); } };
      const exitEditMode  = () => { if (currentSubmission?.id) { isEditing = false; fillSubmissionValues(currentSubmission); applyViewMode(); } };

      // API helpers
      const fetchSubmissionForCampaign = async ({ tiktok_user_id, campaign_id }) => {
        const qs = new URLSearchParams({
          tiktok_user_id,
          campaign_id,
          per_page: '1',
          _: String(Date.now())
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
      const fetchSubmissionById = async (id) => {
        const r = await fetch(`/api/influencer-submissions/${id}?_=${Date.now()}`, {
          headers: { 'Accept':'application/json' },
          credentials: 'same-origin',
          cache: 'no-store'
        });
        if (!r.ok) return null;
        return await r.json();
      };

      const fetchRegsByUsername = async (uname) => {
        if (!uname) return [];
        const qs = new URLSearchParams({
          tiktok_username: uname,
          include: 'campaign',
          per_page: '50',
          _: String(Date.now())
        }).toString();
        const r = await fetch(`/api/influencer-registrations?${qs}`, {
          headers: { 'Accept': 'application/json' },
          credentials: 'same-origin',
          cache: 'no-store'
        });
        if (!r.ok) return [];
        const j = await r.json();
        return Array.isArray(j) ? j : (j?.data || []);
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

      const loadSubmissionForSelected = async () => {
        isEditing = false;
        if (!openId || !selectedCampaignId) { clearSubmissionView(); fillContactFields(null, {}); return; }
        try {
          showLoader();
          // set currentRegistration for this campaign
          currentRegistration = regsMapByCampaign.get(Number(selectedCampaignId)) || null;
          const contactFallback = getContactFrom(currentRegistration || {});
          fillContactFields(currentRegistration, contactFallback);

          const rec = await fetchSubmissionForCampaign({ tiktok_user_id: openId, campaign_id: selectedCampaignId });
          currentSubmission = rec || null;
          if (currentSubmission) { fillSubmissionValues(currentSubmission); applyViewMode(); }
          else { clearSubmissionView(); }
        } catch (e) {
          console.warn('fetchSubmissionForCampaign error', e);
          clearSubmissionView();
        } finally {
          hideLoader();
        }
      };

      function renderCampaignButtons(items) {
        const listEl = $("#campaignList");
        regsMapByCampaign = new Map();
        if (!Array.isArray(items) || items.length === 0) {
          listEl.innerHTML = `<div class="text-muted small">Belum ada campaign yang diikuti.</div>`;
          setTitle('My Campaign');
          clearSubmissionView();
          return;
        }

        // build map & UI
        listEl.innerHTML = items.map((r, i) => {
          const c = r.campaign || {};
          const cid = c.id ?? r.campaign_id ?? '';
          regsMapByCampaign.set(Number(cid), r);
          const cname = safe(c.name, r.campaign_name || `Campaign ${i + 1}`);
          const oid = r.tiktok_user_id || '';
          return `
            <button class="btn btn-dark text-start py-2 campaign-item ${i===0?'active':''}"
                    data-campaign-id="${cid}" data-open-id="${oid}">
              ${cname}
            </button>
          `;
        }).join('');

        const first = listEl.querySelector('.campaign-item');
        if (first) {
          selectedCampaignId = first.getAttribute('data-campaign-id');
          openId = first.getAttribute('data-open-id') || openId;
          setTitle(first.textContent.trim());
        }

        listEl.querySelectorAll('.campaign-item').forEach(btn => {
          btn.addEventListener('click', async () => {
            listEl.querySelectorAll('.campaign-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedCampaignId = btn.getAttribute('data-campaign-id');
            openId = btn.getAttribute('data-open-id') || openId;
            setTitle(btn.textContent.trim());
            await loadSubmissionForSelected();
          });
        });

        loadSubmissionForSelected();
      }

      // Save Contact button
      saveContactBtn?.addEventListener('click', async () => {
        if (!currentRegistration?.id) {
          showToast('Registrasi untuk campaign ini tidak ditemukan.', 'error');
          return;
        }
        const phone = contactPhoneEl.value.trim();
        const email = contactEmailEl.value.trim();
        const addr  = contactAddressEl.value.trim();

        // minimal validation email jika diisi
        if (email && !/^\S+@\S+\.\S+$/.test(email)) {
          showToast('Format email tidak valid.', 'error');
          return;
        }

        const fd = new FormData();
        // terima berbagai key umum di backend (pilih yang didukung)
        fd.set('_method', 'PATCH');
        if (phone) { fd.set('phone', phone); fd.set('contact_phone', phone); }
        if (email) { fd.set('email', email); fd.set('contact_email', email); }
        if (addr)  { fd.set('address', addr); fd.set('alamat', addr); fd.set('shipping_address', addr); }

        try {
          showLoader();
          let resp;
          if (typeof influencerService?.update === 'function') {
            resp = await influencerService.update(currentRegistration.id, fd);
          } else {
            const r = await fetch(`/api/influencer-registrations/${currentRegistration.id}`, {
              method: 'POST',
              credentials: 'same-origin',
              body: fd,
              cache: 'no-store'
            });
            if (!r.ok) throw new Error('Gagal menyimpan kontak');
            resp = await r.json();
          }
          showToast(resp?.message || 'Kontak berhasil disimpan');
          // refresh reg in map (optional)
          try {
            const r = await fetch(`/api/influencer-registrations/${currentRegistration.id}?_=${Date.now()}`, {
              headers: { 'Accept':'application/json' }, credentials:'same-origin', cache:'no-store'
            });
            if (r.ok) {
              const freshReg = await r.json();
              regsMapByCampaign.set(Number(selectedCampaignId), freshReg);
              currentRegistration = freshReg;
            }
          } catch {}
        } catch (err) {
          showToast(err.message || 'Gagal menyimpan kontak', 'error');
        } finally {
          hideLoader();
        }
      });

      // Tombol Edit/Batal
      $("#editBtn")?.addEventListener('click', enterEditMode);
      $("#cancelEditBtn")?.addEventListener('click', exitEditMode);

      // Submit handler (submission only; shipping tidak pernah dikirim dari KOL)
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

        const forceAll = !!(currentSubmission?.id);
        const addField = (id, key = null, force = false) => {
          const el = $("#"+id);
          if (!el) return;
          const name = key || id.replace(/-/g,'_');
          if (force) { if (hasVal(el.value)) fd.set(name, el.value.trim()); }
          else { if (!el.disabled && hasVal(el.value)) fd.set(name, el.value.trim()); }
        };

        // slot 1–5
        addField('link-1','link_1', forceAll);
        addField('post_date_1','post_date_1', forceAll);
        addField('link-2','link_2', forceAll);
        addField('post_date_2','post_date_2', forceAll);
        addField('link-3','link_3', forceAll);
        addField('post_date_3','post_date_3', forceAll);
        addField('link-4','link_4', forceAll);
        addField('post_date_4','post_date_4', forceAll);
        addField('link-5','link_5', forceAll);
        addField('post_date_5','post_date_5', forceAll);

        // acquisition (TANPA shipping)
        addField('acquisition_method','acquisition_method', forceAll);
        addField('purchase_platform','purchase_platform', forceAll);
        addField('purchase_price','purchase_price', forceAll);
        // NOTE: shipping_courier & shipping_tracking_number tidak dikirim dari KOL

        // Files
        const sc1 = $("#screenshot_1")?.files?.[0];
        const sc2 = $("#screenshot_2")?.files?.[0];
        const sc3 = $("#screenshot_3")?.files?.[0];
        const sc4 = $("#screenshot_4")?.files?.[0];
        const sc5 = $("#screenshot_5")?.files?.[0];
        const inv = $("#invoice_file")?.files?.[0];
        const rev = $("#review_proof_file")?.files?.[0];
        if (sc1) fd.set('screenshot_1', sc1);
        if (sc2) fd.set('screenshot_2', sc2);
        if (sc3) fd.set('screenshot_3', sc3);
        if (sc4) fd.set('screenshot_4', sc4);
        if (sc5) fd.set('screenshot_5', sc5);
        if (inv) fd.set('invoice_file', inv);
        if (rev) fd.set('review_proof_file', rev);

        try {
          showLoader();
          const btn = $("#submitBtn");
          btn.disabled = true;

          let resp;
          if (currentSubmission?.id) {
            fd.set('_method', 'PATCH');
            const r = await fetch(`/api/influencer-submissions/${currentSubmission.id}`, {
              method: 'POST',
              credentials: 'same-origin',
              body: fd,
              cache: 'no-store'
            });
            if (!r.ok) throw new Error('Gagal update');
            resp = await r.json();
            showToast(resp?.message || 'Data berhasil diupdate');

            const fresh = await fetchSubmissionById(currentSubmission.id);
            if (fresh) {
              currentSubmission = fresh;
              fillSubmissionValues(currentSubmission);
              isEditing = false;
              applyViewMode();
            } else {
              await loadSubmissionForSelected();
            }
          } else {
            if (typeof submissionService?.create === 'function') {
              resp = await submissionService.create(fd);
            } else {
              const r = await fetch('/api/influencer-submissions', {
                method: 'POST',
                credentials: 'same-origin',
                body: fd,
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

      // Preview untuk semua input file (local blob)
      ['screenshot_1','screenshot_2','screenshot_3','screenshot_4','screenshot_5','invoice_file','review_proof_file'].forEach(wirePreview);

      // ======== Load profile + campaigns ========
      try {
        // 1) session /me/tiktok
        let me = {};
        try {
          const res = await fetch('/me/tiktok', {
            headers: { 'Accept':'application/json' },
            credentials: 'same-origin',
            cache: 'no-store'
          });
          if (res.ok) me = await res.json();
        } catch {}

        // 2) profile gabungan (session + cache)
        const cache = readLocalProfile() || {};
        const profile = mergeProfile(me, cache);

        // 3) render profil
        $("#profileName").textContent = profile.tiktok_full_name || 'Creator';
        $("#profileHandle").textContent = profile.tiktok_username ? '@' + profile.tiktok_username : '';
        if (profile.tiktok_avatar_url) {
          $("#profileAvatarIcon")?.classList.add('d-none');
          const img = $("#profileAvatarImg");
          img.src = profile.tiktok_avatar_url;
          img.classList.remove('d-none');
        }

        // 4) regs by open_id + by username → merge unik per campaign
        let regsById = [];
        if (profile.tiktok_user_id) {
          const result = await influencerService.getAll({
            tiktok_user_id: profile.tiktok_user_id,
            include: 'campaign',
            per_page: 50,
            _: Date.now()
          });
          regsById = Array.isArray(result) ? result : (result?.data || []);
        }
        const regsByUname = profile.tiktok_username ? await fetchRegsByUsername(profile.tiktok_username) : [];
        const regs = mergeRegsUniqueByCampaign(regsById, regsByUname);

        renderCampaignButtons(regs);
      } catch (e) {
        console.warn('Load profile/campaigns failed (merged):', e);
        renderCampaignButtons([]);
      }

      // Init visibility
      applyAcquisitionVisibility();
      resetSlotVisibility();

      // Logout
      $("#logoutBtn")?.addEventListener('click', async () => {
        try {
          await fetch('/logout', { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' }});
        } catch {}
        localStorage.removeItem('kol_profile');
        location.assign('/');
      });
    })
    .catch((err) => console.error('[my-profile] Failed dynamic imports:', err));
}
