// /js/pages/kol/register.js
export function render(target, params, query = {}, labelOverride = null) {
    const v = window.BUILD_VERSION || Date.now();

    // Markup
    target.innerHTML = `
    <section class="page-section min-vh-100 d-flex align-items-center">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-5 col-md-8">
            <div class="card">
              <div class="card-body p-4 p-md-5">

                <!-- Avatar (opsional, tampil kalau ada URL) -->
                <div class="text-center mb-3 d-none" id="avatarWrap">
                  <img id="avatarImg" src="" alt="Profile Picture"
                       style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.12);">
                </div>

                <form id="registerForm" class="needs-validation w-100" novalidate>
                  <!-- Hidden -->
                  <input type="hidden" name="tiktok_user_id" id="tiktok_user_id" value="">
                  <input type="hidden" name="profile_pic_url" id="profile_pic_url" value="">
                  <input type="hidden" name="campaign_id" id="campaign_id" value="">
                  <input type="hidden" name="campaign" id="campaign" value="">

                  <!-- Connect TikTok (baru) -->
                  <div id="tiktokConnectBox" class="alert alert-dark d-none" role="alert">
                    <div class="d-flex align-items-center justify-content-between">
                      <div class="pe-3">
                        <div class="fw-semibold">Connect your TikTok to autofill</div>
                        <small class="text-muted">We’ll only read your basic profile (name, username & avatar).</small>
                      </div>
                      <a id="connectTiktokBtn" class="btn btn-sm btn-light ms-3" href="#">
                        Connect TikTok
                      </a>
                    </div>
                  </div>

                  <div id="alreadyBox" class="alert alert-success d-none" role="alert">
                    You are already registered for this campaign. Your data has been loaded.
                  </div>

                  <div id="prefilledBox" class="alert alert-info d-none" role="alert">
                    We prefilled your information from your previous registration. Please review and submit.
                  </div>

                  <div class="d-flex flex-column gap-3">
                    <div class="d-flex gap-3">
                      <div class="form-group">
                        <input type="text" class="form-control form-control-lg" id="full_name" name="full_name" placeholder="Full Name" required>
                        <div class="invalid-feedback"></div>
                      </div>

                      <div class="form-group">
                        <input type="text" class="form-control form-control-lg" id="tiktok_username" name="tiktok_username" placeholder="TikTok Username (without @)" required>
                        <div class="invalid-feedback"></div>
                      </div>
                    </div>

                    <div class="d-flex gap-3">
                      <div class="form-group">
                        <input type="tel" class="form-control form-control-lg" id="phone" name="phone" placeholder="Phone Number" required>
                        <div class="invalid-feedback"></div>
                      </div>

                      <div class="form-group">
                        <input type="email" class="form-control form-control-lg" id="email" name="email" placeholder="Email" required>
                        <div class="invalid-feedback"></div>
                      </div>
                    </div>

                    <div class="d-flex gap-3">

                      <div class="form-group">
                        <input type="date" class="form-control form-control-lg" id="birth_date" name="birth_date" placeholder="Birth Date" required>
                        <div class="invalid-feedback"></div>
                      </div>

                      <!-- Gender -->
                      <div class="form-group">
                        <select class="form-control form-control-lg" id="gender" name="gender">
                          <option value="">Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                        <div class="invalid-feedback"></div>
                      </div>

                    </div>

                    <!-- Address -->
                    <div class="form-group">
                      <textarea class="form-control form-control-lg" id="address" name="address" placeholder="Address" required></textarea>
                      <div class="invalid-feedback"></div>
                    </div>
                  </div>

                  <div class="mt-3 d-grid gap-2">
                    <button type="submit" class="btn btn-dark btn-lg w-100 py-2 fw-semibold" id="submitBtn">
                      Register
                    </button>
                    <a href="/my-profile" class="btn btn-outline-dark w-100 d-none" id="goProfileBtn">
                      Lihat Profil
                    </a>
                  </div>
                </form>

              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

    // Dynamic imports
    Promise.all([
        import(`/js/components/headerKol.js?v=${v}`),
        import(`/js/components/footerKol.js?v=${v}`),
        import(`/js/services/influencerRegistrationService.js?v=${v}`),
        import(`/js/components/loader.js?v=${v}`),
        import(`/js/utils/toast.js?v=${v}`),
    ])
        .then(
            async ([headerMod, footerMod, serviceMod, loaderMod, toastMod]) => {
                const { renderHeaderKol } = headerMod;
                const { renderFooterKol } = footerMod;
                const { influencerService } = serviceMod;
                const { showLoader, hideLoader } = loaderMod;
                const { showToast } = toastMod;

                renderHeaderKol("header");
                renderFooterKol();

                const $ = (sel) => document.querySelector(sel);

                const form = $("#registerForm");
                const submitBtn = $("#submitBtn");
                const goProfileBtn = $("#goProfileBtn");

                // Hidden
                const tiktokIdEl = $("#tiktok_user_id");
                const avatarUrlEl = $("#profile_pic_url");
                const campaignIdEl = $("#campaign_id");
                const campaignSlugEl = $("#campaign");

                // Visible
                const fullNameEl = $("#full_name");
                const usernameEl = $("#tiktok_username");
                const phoneEl = $("#phone");
                const emailEl = $("#email");
                const addressEl = $("#address");
                const birthDateEl = $("#birth_date");
                const genderEl = $("#gender");

                // UI boxes
                const avatarWrap = $("#avatarWrap");
                const avatarImg = $("#avatarImg");
                const alreadyBox = $("#alreadyBox");
                const prefilledBox = $("#prefilledBox");
                const connectBox = $("#tiktokConnectBox");
                const connectBtn = $("#connectTiktokBtn");

                const clearErrors = () => {
                    form.querySelectorAll(".is-invalid").forEach((el) =>
                        el.classList.remove("is-invalid")
                    );
                    form.querySelectorAll(".invalid-feedback").forEach(
                        (el) => (el.textContent = "")
                    );
                };

                const showErrors = (errors = {}) => {
                    Object.entries(errors).forEach(([field, messages]) => {
                        const input = form.querySelector(`[name="${field}"]`);
                        if (!input) return;
                        input.classList.add("is-invalid");
                        const fb = input
                            .closest(".form-group")
                            ?.querySelector(".invalid-feedback");
                        if (fb)
                            fb.textContent = Array.isArray(messages)
                                ? messages[0]
                                : String(messages);
                    });
                };

                const setReadonly = (flag) => {
                    [
                        fullNameEl,
                        usernameEl,
                        phoneEl,
                        addressEl,
                        birthDateEl,
                    ].forEach((el) => {
                        if (!el) return;
                        if (flag) el.setAttribute("readonly", "readonly");
                        else el.removeAttribute("readonly");
                    });
                    // select tidak punya readonly -> gunakan disabled
                    if (genderEl) {
                        if (flag) genderEl.setAttribute("disabled", "disabled");
                        else genderEl.removeAttribute("disabled");
                    }
                    submitBtn.classList.toggle("d-none", flag);
                    goProfileBtn.classList.toggle("d-none", !flag);
                    alreadyBox.classList.toggle("d-none", !flag);
                };

                const fillForm = (reg) => {
                    if (!reg) return;
                    if (reg.full_name) fullNameEl.value = reg.full_name;
                    if (reg.tiktok_username)
                        usernameEl.value = reg.tiktok_username;
                    if (reg.phone) phoneEl.value = reg.phone;
                    if (reg.email) emailEl.value = reg.email;
                    if (reg.address) addressEl.value = reg.address;
                    if (reg.birth_date) birthDateEl.value = reg.birth_date;
                    if (reg.gender) genderEl.value = reg.gender;
                    if (reg.tiktok_user_id)
                        tiktokIdEl.value = reg.tiktok_user_id;
                    if (reg.profile_pic_url) {
                        avatarUrlEl.value = reg.profile_pic_url;
                        avatarImg.src = reg.profile_pic_url;
                        avatarWrap.classList.remove("d-none");
                    }
                };

                // Helper: normalisasi username (tanpa @) — cuma formatting, tidak mengubah field yg dikirim selain value inputnya sendiri
                const normalizeHandle = (val) => {
                    return (val || "").toString().trim().replace(/^@+/, "");
                };

                // Buat pseudo open_id dari handle (deterministik) — tetap sama dengan implementasi sebelumnya
                const makePseudoId = (handle) => {
                    const h = normalizeHandle(handle).toLowerCase();
                    if (!h) return "";
                    return `pseudo_${h}`;
                };

                // --- Campaign dari query ---
                (function applyCampaignFromQuery() {
                    const u = new URL(location.href);
                    let cId = u.searchParams.get("campaign_id");
                    let cSlug = u.searchParams.get("campaign");

                    if (!cId && !cSlug) {
                        // fallback format lama: ?my-campaign-slug (tanpa key)
                        const raw = u.search.replace(/^\?/, "");
                        if (raw && !raw.includes("=")) cSlug = raw;
                    }

                    if (cId) campaignIdEl.value = cId;
                    if (cSlug) campaignSlugEl.value = cSlug;

                    // Siapkan link Connect TikTok dengan membawa campaign params
                    const qs = new URLSearchParams();
                    if (cId) qs.set("campaign_id", cId);
                    if (cSlug) qs.set("campaign", cSlug);
                    if (connectBtn) {
                        connectBtn.href = `/auth/tiktok/redirect${
                            qs.toString() ? `?${qs.toString()}` : ""
                        }`;
                        connectBtn.addEventListener("click", (e) => {
                            e.preventDefault();
                            window.location.assign(connectBtn.href);
                        });
                    }

                    // kalau balik dari OAuth → kasih feedback kecil
                    if (u.searchParams.get("connected") === "tiktok") {
                        showToast(
                            "TikTok connected. Please review and submit your info.",
                            "success"
                        );
                    }
                })();

                // Prefill dari localStorage (biar campaign-2 mudah)
                try {
                    const cache = JSON.parse(
                        localStorage.getItem("kol_profile") || "null"
                    );
                    if (cache) {
                        fillForm(cache);
                    }
                } catch {}

                // Prefill tambahan dari hasil callback OAuth (query param)
                (function prefillFromQueryIdentity() {
                    const u = new URL(location.href);
                    const qOpenId = u.searchParams.get("open_id"); // set di callback
                    const qName = u.searchParams.get("name");
                    const qUser = u.searchParams.get("username");
                    const qAvatar = u.searchParams.get("avatar");

                    if (qOpenId) {
                        tiktokIdEl.value = qOpenId; // pakai open_id asli
                    }
                    if (qName && !fullNameEl.value) {
                        fullNameEl.value = qName;
                    }
                    if (qUser && !usernameEl.value) {
                        usernameEl.value = normalizeHandle(qUser);
                    }
                    if (qAvatar) {
                        avatarUrlEl.value = qAvatar;
                        avatarImg.src = qAvatar;
                        avatarWrap.classList.remove("d-none");
                    }
                })();

                // Prefill dari session TikTok (kalau ada)
                try {
                    const res = await fetch("/me/tiktok", {
                        headers: { Accept: "application/json" },
                        credentials: "same-origin",
                    });
                    if (res.ok) {
                        const me = await res.json();
                        if (me?.tiktok_user_id && !tiktokIdEl.value)
                            tiktokIdEl.value = me.tiktok_user_id;
                        if (me?.tiktok_full_name && !fullNameEl.value)
                            fullNameEl.value = me.tiktok_full_name;
                        if (me?.tiktok_username && !usernameEl.value)
                            usernameEl.value = normalizeHandle(
                                me.tiktok_username
                            );
                        if (me?.tiktok_avatar_url && !avatarUrlEl.value) {
                            avatarUrlEl.value = me.tiktok_avatar_url;
                            avatarImg.src = me.tiktok_avatar_url;
                            avatarWrap.classList.remove("d-none");
                        }
                    }
                } catch {}

                // Tampilkan/hidden box Connect TikTok (muncul kalau belum ada open_id real)
                connectBox?.classList.toggle("d-none", !!tiktokIdEl.value);

                // Saat user isi username → set tiktok_user_id pseudo (kalau belum punya open_id asli)
                async function onHandleChange() {
                    const handle = normalizeHandle(usernameEl.value);
                    usernameEl.value = handle;

                    // kalau sudah ada open_id dari TikTok OAuth, jangan timpa
                    if (!tiktokIdEl.value) {
                        const pid = makePseudoId(handle);
                        tiktokIdEl.value = pid;
                    }

                    if (!tiktokIdEl.value) return;
                    try {
                        const q = new URLSearchParams({
                            tiktok_user_id: tiktokIdEl.value,
                        });
                        const res = await fetch(
                            `/api/influencer-registrations/check?${q.toString()}`,
                            {
                                headers: { Accept: "application/json" },
                                credentials: "same-origin",
                            }
                        );
                        if (!res.ok) return;
                        const data = await res.json();
                        if (data?.exists && data?.data) {
                            fillForm(data.data);
                            setReadonly(false);
                            prefilledBox.classList.remove("d-none");
                        }
                    } catch {}
                }
                usernameEl.addEventListener("blur", onHandleChange);
                usernameEl.addEventListener("change", onHandleChange);

                // === CEK: sudah terdaftar untuk campaign ini? ===
                async function checkAlreadyRegisteredForCampaign() {
                    const openId = tiktokIdEl.value?.trim();
                    const cId = campaignIdEl.value?.trim();
                    const cSlug = campaignSlugEl.value?.trim();

                    if (!openId) return { exists: false };

                    const q = new URLSearchParams({ tiktok_user_id: openId });
                    if (cId) q.set("campaign_id", cId);
                    if (cSlug) q.set("campaign", cSlug);

                    try {
                        const res = await fetch(
                            `/api/influencer-registrations/check?${q.toString()}`,
                            {
                                headers: { Accept: "application/json" },
                                credentials: "same-origin",
                            }
                        );
                        if (!res.ok) return { exists: false };
                        const data = await res.json();

                        if (data.exists) {
                            fillForm(data.data);
                            setReadonly(true);
                            if (
                                !avatarUrlEl.value &&
                                data.data?.profile_pic_url
                            ) {
                                avatarUrlEl.value = data.data.profile_pic_url;
                                avatarImg.src = data.data.profile_pic_url;
                                avatarWrap.classList.remove("d-none");
                            }
                            return { exists: true };
                        }
                        return { exists: false };
                    } catch {
                        return { exists: false };
                    }
                }

                // Prefill awal
                await onHandleChange();
                const campaignCheck = await checkAlreadyRegisteredForCampaign();
                if (!campaignCheck.exists) {
                    // belum terdaftar; biarkan user isi normal
                }

                // Submit (payload tetap: FormData(form) sesuai field yg ada)
                form.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    clearErrors();

                    // pastikan open_id terisi: pakai yang dari TikTok kalau ada; kalau tidak ada, pseudo dari username
                    usernameEl.value = normalizeHandle(usernameEl.value);
                    if (!tiktokIdEl.value) {
                        tiktokIdEl.value = makePseudoId(usernameEl.value);
                    }

                    if (!form.checkValidity()) {
                        form.classList.add("was-validated");
                        return;
                    }

                    const formData = new FormData(form); // semua field (termasuk gender) dikirim apa adanya

                    try {
                        showLoader();
                        submitBtn.disabled = true;

                        const resp = await influencerService.create(formData); // 201 (baru) atau 200 exists:true

                        hideLoader();
                        submitBtn.disabled = false;

                        // Simpan ke localStorage untuk prefill campaign lain (tanpa mengubah key yg dikirim)
                        try {
                            const cache = {
                                full_name: fullNameEl.value,
                                tiktok_username: usernameEl.value,
                                phone: phoneEl.value,
                                email: emailEl.value,
                                address: addressEl.value,
                                birth_date: birthDateEl.value,
                                gender: genderEl.value,
                                tiktok_user_id: tiktokIdEl.value,
                                profile_pic_url: avatarUrlEl.value,
                            };
                            localStorage.setItem(
                                "kol_profile",
                                JSON.stringify(cache)
                            );
                        } catch {}

                        showToast(
                            resp?.message ||
                                (resp?.exists
                                    ? "Sudah terdaftar."
                                    : "Registrasi berhasil disimpan."),
                            "success"
                        );

                        if (resp && resp.data) {
                            fillForm(resp.data);
                            setReadonly(true);
                        }

                        const next = "/my-profile";
                        if (location.pathname !== next) {
                            window.location.href = next;
                        }
                    } catch (err) {
                        hideLoader();
                        submitBtn.disabled = false;

                        if (err?.status === 422 && err?.errors) {
                            showErrors(err.errors);
                        } else {
                            showToast(
                                err?.message || "Gagal menyimpan registrasi.",
                                "error"
                            );
                        }
                    }
                });
            }
        )
        .catch((err) => {
            console.error("[register] Failed to import modules", err);
        });
}
