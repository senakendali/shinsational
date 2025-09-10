// /js/pages/kol/my-profile.js
export function render(target, params, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();

  // Tinggi header kira-kira (sesuaikan jika header berubah)
  const HEADER_H = 127;

  // Render shell dulu
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

            <form class="needs-validation" novalidate>
              <div class="d-flex flex-column gap-3">
                <div>
                  <label for="link-1" class="form-label text-muted">Link Postingan 1</label>
                  <input type="text" class="form-control" id="link-1" required>
                  <div class="invalid-feedback">Please enter valid link.</div>
                </div>
                <div>
                  <label for="link-2" class="form-label text-muted">Link Postingan 2</label>
                  <input type="text" class="form-control" id="link-2" required>
                  <div class="invalid-feedback">Please enter valid link.</div>
                </div>
                <div class="pt-2 d-flex justify-content-end">
                  <button type="submit" class="btn btn-dark px-4">Kirim</button>
                </div>
              </div>
            </form>

          </div>
        </main>
      </div>
    </div>
  `;

  // Dynamic imports ala index.js
  Promise.all([
    import(`/js/components/headerKol.js?v=${v}`),
    import(`/js/components/footerKol.js?v=${v}`),
    import(`/js/services/influencerRegistrationService.js?v=${v}`),
  ])
    .then(async ([headerMod, footerMod, serviceMod]) => {
      const { renderHeaderKol } = headerMod;
      const { renderFooterKol } = footerMod;
      const { influencerService } = serviceMod;

      // Render header/footer
      renderHeaderKol("header");
      renderFooterKol();

      // Helpers
      const $ = (sel) => document.querySelector(sel);
      const safe = (val, def = '') => (val == null ? def : val);

      function renderCampaignButtons(registrations) {
        const listEl = $("#campaignList");
        if (!Array.isArray(registrations) || registrations.length === 0) {
          listEl.innerHTML = `<div class="text-muted small">Belum ada campaign yang diikuti.</div>`;
          return;
        }

        listEl.innerHTML = registrations
          .map((r) => {
            // Prefer relasi campaign bila backend sudah include
            const c = r.campaign || {};
            const name = safe(c.name, r.campaign_name || 'Campaign');
            return `
              <button class="btn btn-dark text-start py-2 campaign-item" data-campaign-id="${safe(c.id,'')}">
                ${name}
              </button>
            `;
          })
          .join("");

        // Update title kanan saat klik
        listEl.querySelectorAll(".campaign-item").forEach((btn) => {
          btn.addEventListener("click", () => {
            const text = btn.textContent.trim();
            $("#mainCampaignTitle").textContent = text;
            // TODO: optionally load detail per campaign
          });
        });
      }

      // Form validation
      const form = document.querySelector(".needs-validation");
      if (form) {
        form.addEventListener("submit", (e) => {
          if (!form.checkValidity()) {
            e.preventDefault();
            e.stopPropagation();
          }
          form.classList.add("was-validated");
        });
      }

      // Load profile dari session + campaigns yang diikuti
      try {
        const res = await fetch('/me/tiktok', {
          headers: { 'Accept': 'application/json' },
          credentials: 'same-origin',
        });
        if (!res.ok) throw new Error('cannot fetch session');

        const me = await res.json();
        const name   = safe(me.tiktok_full_name, 'Creator');
        const avatar = safe(me.tiktok_avatar_url, '');
        const openId = me.tiktok_user_id;

        // Set nama
        $("#profileName").textContent = name;

        // (opsional) jika suatu saat kamu simpan username di session:
        // $("#profileHandle").textContent = '@' + (me.tiktok_username || '');

        // Set avatar jika tersedia
        if (avatar) {
          $("#profileAvatarIcon")?.classList.add('d-none');
          const img = $("#profileAvatarImg");
          if (img) {
            img.src = avatar;
            img.classList.remove('d-none');
          }
        }

        // Fetch campaigns by influencer (registrations)
        if (openId) {
          const result = await influencerService.getAll({
            tiktok_user_id: openId,
            include: 'campaign', // kalau backend support include relasi
            per_page: 50,
          });

          const items = Array.isArray(result) ? result : (result.data || []);
          renderCampaignButtons(items);
        } else {
          renderCampaignButtons([]);
        }
      } catch (err) {
        console.warn('Load profile/campaigns failed:', err);
        renderCampaignButtons([]);
      }

      // (Opsional) logout handler
      // $("#logoutBtn")?.addEventListener("click", async () => {
      //   // TODO: panggil authService.logout() lalu redirect
      // });
    })
    .catch((err) => {
      console.error('[my-profile] Failed dynamic imports:', err);
    });
}
