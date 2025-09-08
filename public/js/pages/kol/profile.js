const v = window.BUILD_VERSION;

const { renderHeaderKol } = await import(
    `../../components/headerKol.js?v=${v}`
);
const { renderFooterKol } = await import(
    `../../components/footerKol.js?v=${v}`
);

export function render(target, params, query = {}, labelOverride = null) {
    renderHeaderKol("header");

    target.innerHTML = `
      <div class="container-fluid vh-100" style="margin-top: 140px;">
        <div class="row g-0 h-100 ">
            <!-- Sidebar -->
            <div class="col-md-3 bg-light border-end d-flex flex-column">

            <!-- Logout Section -->
                <div class="py-3">
                    <button class="btn btn-sm btn-danger align-items-center ">
                        <i class="bi bi-box-arrow-right  "></i>
                        <span>Logout</span>
                    </button>
                </div>
                <!-- Profile Header -->
                <div class="text-center p-4 border-bottom ">
                    <div class="pb-3">
                        <div class="rounded-circle mx-auto " style="width: 100px; height: 100px;">
                          <i class="bi bi-person-circle" style="font-size: 100px;" ></i>
                        </div>
                    </div>
                    <div class="pt-4">
                        <h5 class="fw-semibold">John Doe</h5>
                        <p class="text-muted small mb-0">@johndoe</p>
                    </div>
                </div>
                
                <!-- Campaigns Section -->
                <div class="flex-grow-1 p-3 ">
                    <h6 class="text-uppercase text-muted small fw-bold mb-3">CAMPAIGNS</h6>
                    <div class="d-grid gap-2">
                        <button class="btn btn-dark text-start py-2" type="button">
                            Campaign A
                        </button>
                        <button class="btn btn-dark text-start py-2" type="button">
                            Campaign B
                        </button>
                    </div>
                </div>
                
                
            </div>
            
            <!-- Main Content -->
            <div class="col-md-9 bg-white">
                <div class="h-100 d-flex flex-column pt-5">
                    <div class="p-4 flex-grow-1">
                        <h4 class="mb-4">Campaign A</h4>
                        
                        <form class="needs-validation" novalidate>
                            <div class="flex flex-column g-2">
                                <div class="">
                                    <label for="link-1" class="form-label text-muted">Link Postingan 1</label>
                                    <input type="text" class="form-control" id="link-1" value="" required>
                                    <div class="invalid-feedback">Please enter valid link .</div>
                                </div>
                                
                                <div class="py-3">
                                    <label for="link-2" class="form-label text-muted">Link Postingan 2</label>
                                    <input type="text" class="form-control" id="link-2" value="" required>
                                    <div class="invalid-feedback">Please enter valid link .</div>
                                </div>
                                <div class="p-4 d-flex justify-content-end">
                                    <button type="submit" class="btn btn-dark px-4">Kirim</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
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
}
