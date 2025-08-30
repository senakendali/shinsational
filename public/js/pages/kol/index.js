import { renderHeaderKol } from "../../components/headerKol.js";

export function render(target, params, query = {}, labelOverride = null) {
    renderHeaderKol("header");

    target.innerHTML = `
        <!-- Banner Section -->
        <section class="min-vh-100 d-flex align-items-center bg-black">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-lg-5 col-md-8">
                    <div class=" ">
                        <h1 class="display-1 fw-bold text-light">Welcome Creator !</h1>
                    </div>
                </div>
            </div>
        </div>
    </section>

        <!-- Guidelines Section -->
        <section class="min-vh-100 d-flex align-items-center bg-light" >
            <div class="container pt-5">
                <h2 class="text-center mb-5" >How It Works</h2>
                <div class="row g-4">
                    <div class="col-md-3" id="guidelines">
                        <div class="card h-100 border-0 shadow-sm step-card">
                            <div class="card-body text-center p-4">
                                <p class="card-title fw-semibold">Step 1</p>
                                <div class="step-icon mx-auto mb-3">
                                    <i class="bi bi-box-arrow-in-left"></i>
                                </div>
                                <p class="card-text">Sign Up + Otorisasi Sosial Media</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card h-100 border-0 shadow-sm step-card">
                            <div class="card-body text-center p-4">
                                <p class="card-title fw-semibold">Step 2</p>
                                <div class="step-icon mx-auto mb-3">
                                    <i class="bi bi-clipboard-check"></i>
                                </div>
                                <p class="card-text">Approval Registrasi oleh Client/Agency</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card h-100 border-0 shadow-sm step-card">
                            <div class="card-body text-center p-4">
                                <p class="card-title fw-semibold">Step 3</p>
                                <div class="step-icon mx-auto mb-3">
                                    <i class="bi bi-upload"></i>
                                </div>
                                <p class="card-text">Upload Draft Content</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card h-100 border-0 shadow-sm step-card">
                            <div class="card-body text-center p-4">
                                <p class="card-title fw-semibold">Step 4</p>
                                <div class="step-icon mx-auto mb-3">
                                    <i class="bi bi-arrow-left-right"></i>
                                </div>
                                <p class="card-text">Feedback/Approval Draft</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card h-100 border-0 shadow-sm step-card">
                            <div class="card-body text-center p-4">
                                <p class="card-title fw-semibold">Step 5</p>
                                <div class="step-icon mx-auto mb-3">
                                    <i class="bi bi-file-earmark-arrow-up"></i>
                                </div>
                                <p class="card-text">Upload Final Content</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card h-100 border-0 shadow-sm step-card">
                            <div class="card-body text-center p-4">
                                <p class="card-title fw-semibold">Step 6</p>
                                <div class="step-icon mx-auto mb-3">
                                    <i class="bi bi-link"></i>
                                </div>
                                <p class="card-text">Upload Link Post + Bukti Tayang</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card h-100 border-0 shadow-sm step-card">
                            <div class="card-body text-center p-4">
                                <p class="card-title fw-semibold">Step 7</p>
                                <div class="step-icon mx-auto mb-3">
                                    <i class="bi bi-receipt"></i>
                                </div>
                                <p class="card-text">Upload invoice pembelian + Bukti tayang R&R*</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card h-100 border-0 shadow-sm step-card">
                            <div class="card-body text-center p-4">
                                <p class="card-title fw-semibold">Step 8</p>
                                <div class="step-icon mx-auto mb-3">
                                    <i class="bi bi-card-list"></i>
                                </div>
                                <p class="card-text">Monitor Report Personal</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}
