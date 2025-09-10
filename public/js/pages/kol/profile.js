const v = window.BUILD_VERSION;

const { renderHeaderKol } = await import(
  `../../components/headerKol.js?v=${v}`
);
const { renderFooterKol } = await import(
  `../../components/footerKol.js?v=${v}`
);

export function render(target, params, query = {}, labelOverride = null) {
  renderHeaderKol("header");

  // Tinggi header (approx) → sesuaikan kalau header berubah
  const HEADER_H = 127;

  target.innerHTML = `
    <div class="container-fluid px-0" style="margin-top:${HEADER_H}px;">
      <!-- Shell pakai flex, bukan grid, biar ngga ada sisa gutter -->
      <div class="d-flex flex-column flex-md-row" style="min-height: calc(100vh - ${HEADER_H}px);">

        <!-- Sidebar -->
        <aside
          class="bg-light border-end d-flex flex-column"
          style="
            flex: 0 0 300px;        /* lebar sidebar di >= md */
            max-width: 100%;
          "
        >
          <!-- Profile Header -->
          <div class="text-center p-4 border-bottom">
            <div class="pb-3">
              <div class="rounded-circle mx-auto" style="width: 100px; height: 100px;">
                <i class="bi bi-person-circle" style="font-size: 100px;"></i>
              </div>
            </div>
            <div class="pt-4">
              <h5 class="fw-semibold">John Doe</h5>
              <p class="text-muted small mb-0">@johndoe</p>
            </div>
          </div>

          <!-- Campaigns Section -->
          <div class="flex-grow-1 p-3 overflow-auto">
            <h6 class="text-uppercase text-muted small fw-bold mb-3">CAMPAIGNS</h6>
            <div class="d-grid gap-1">
              <button class="btn btn-dark text-start py-2" type="button">
                Campaign A
              </button>
              <button class="btn btn-dark text-start py-2" type="button">
                Campaign B
              </button>
            </div>
          </div>

          <!-- Logout at bottom -->
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
            <h4 class="mb-4">Campaign A</h4>

            <form class="needs-validation" novalidate>
              <div class="d-flex flex-column gap-3">
                <div>
                  <label for="link-1" class="form-label text-muted">Link Postingan 1</label>
                  <input type="text" class="form-control" id="link-1" value="" required>
                  <div class="invalid-feedback">Please enter valid link.</div>
                </div>

                <div>
                  <label for="link-2" class="form-label text-muted">Link Postingan 2</label>
                  <input type="text" class="form-control" id="link-2" value="" required>
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

  renderFooterKol();

  // Form validation
  const form = document.querySelector(".needs-validation");
  if (form) {
    form.addEventListener(
      "submit",
      function (e) {
        if (!form.checkValidity()) {
          e.preventDefault();
          e.stopPropagation();
        }
        form.classList.add("was-validated");
      },
      false
    );
  }

  // (Opsional) Handler logout
  // document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  //   // TODO: panggil authService.logout() lalu redirect
  // });
}
