// /js/pages/kol/index.js
export function render(target, params, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();
  console.log('[kol/index render] v=', v);

  // Render konten dulu
  target.innerHTML = `
    <!-- Hero Section -->
    <section class="min-vh-100 py-5 py-lg-0 d-flex align-items-center bg-black"
             style="background-image: url('/images/hero-bg.png?v=${v}'); background-size: cover; background-position: center;">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-8 col-md-8">
            <div class="text-center">
              <h1 class="display-1 fw-bold text-light text-uppercase">
                <span>Welcome</span>
                <span>Creator</span>
              </h1>
              <p class="text-light">
                Connect your TikTok account to start tracking your post performance<br/>
                and monitor views, likes, and comments in real time.
              </p>
            </div>
            <div class="d-flex justify-content-center align-items-center mt-2">
              <a href="/auth/tiktok/redirect" class="btn btn-lg py-2 mb-3" style="background-color: #FF0854; color: white;">
                <div class="d-flex justify-content-center align-items-center">
                  <i class="bi bi-tiktok me-2"></i>
                  <span class="fw-semibold fs-6">SIGN IN WITH TIKTOK</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Guidelines Section -->
    <section class="py-5 py-lg-4 mt-lg-2 d-flex align-items-center bg-light">
      <div class="container pt-5" id="guidelines">
        <h2 class="text-center mb-5">How It Works</h2>
        <div class="row">
          <div class="col-12">
            <div class="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
              <div class="col">
                <div class="card h-100 border-0 shadow-sm step-card">
                  <div class="card-body text-center p-4">
                    <p class="card-title fw-semibold">Step 1</p>
                    <div class="step-icon mx-auto mb-3"><i class="bi bi-box-arrow-in-left"></i></div>
                    <p class="fw-medium">Sign Up + Otorisasi Sosial Media</p>
                  </div>
                </div>
              </div>

              <div class="col">
                <div class="card h-100 border-0 shadow-sm step-card">
                  <div class="card-body text-center p-4">
                    <p class="card-title fw-semibold">Step 2</p>
                    <div class="step-icon mx-auto mb-3"><i class="bi bi-clipboard-check"></i></div>
                    <p class="fw-medium">Approval Registrasi oleh Client/Agency</p>
                  </div>
                </div>
              </div>

              <div class="col">
                <div class="card h-100 border-0 shadow-sm step-card">
                  <div class="card-body text-center p-4">
                    <p class="card-title fw-semibold">Step 3</p>
                    <div class="step-icon mx-auto mb-3"><i class="bi bi-upload"></i></div>
                    <p class="fw-medium">Upload Draft Content</p>
                  </div>
                </div>
              </div>

              <div class="col">
                <div class="card h-100 border-0 shadow-sm step-card">
                  <div class="card-body text-center p-4">
                    <p class="card-title fw-semibold">Step 4</p>
                    <div class="step-icon mx-auto mb-3"><i class="bi bi-arrow-left-right"></i></div>
                    <p class="fw-medium">Feedback/Approval Draft</p>
                  </div>
                </div>
              </div>

              <div class="col">
                <div class="card h-100 border-0 shadow-sm step-card">
                  <div class="card-body text-center p-4">
                    <p class="card-title fw-semibold">Step 5</p>
                    <div class="step-icon mx-auto mb-3"><i class="bi bi-file-earmark-arrow-up"></i></div>
                    <p class="fw-medium">Upload Final Content</p>
                  </div>
                </div>
              </div>

              <div class="col">
                <div class="card h-100 border-0 shadow-sm step-card">
                  <div class="card-body text-center p-4">
                    <p class="card-title fw-semibold">Step 6</p>
                    <div class="step-icon mx-auto mb-3"><i class="bi bi-link"></i></div>
                    <p class="fw-medium">Upload Link Post + Bukti Tayang</p>
                  </div>
                </div>
              </div>

              <div class="col">
                <div class="card h-100 border-0 shadow-sm step-card">
                  <div class="card-body text-center p-4">
                    <p class="card-title fw-semibold">Step 7</p>
                    <div class="step-icon mx-auto mb-3"><i class="bi bi-receipt"></i></div>
                    <p class="fw-medium">Upload invoice pembelian + Bukti tayang R&R*</p>
                  </div>
                </div>
              </div>

              <div class="col">
                <div class="card h-100 border-0 shadow-sm step-card">
                  <div class="card-body text-center p-4">
                    <p class="card-title fw-semibold">Step 8</p>
                    <div class="step-icon mx-auto mb-3"><i class="bi bi-card-list"></i></div>
                    <p class="fw-medium">Monitor Report Personal</p>
                  </div>
                </div>
              </div>
            </div><!-- /.row -->
          </div>
        </div>
      </div>
    </section>
  `;

  // Import komponen TANPA await (biar router nggak perlu async)
  Promise.all([
    import(`/js/components/headerKol.js?v=${v}`),
    import(`/js/components/footerKol.js?v=${v}`)
  ])
    .then(([headerMod, footerMod]) => {
      const { renderHeaderKol } = headerMod;
      const { renderFooterKol } = footerMod;

      renderHeaderKol('header');
      renderFooterKol();
    })
    .catch(err => {
      console.error('[Import components failed]', err);
    });
}
