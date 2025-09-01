import { renderHeaderKol } from "../../components/headerKol.js";
import { renderFooterKol } from "../../components/footerKol.js";

export function render(target, params, query = {}, labelOverride = null) {
    renderHeaderKol("header");

    target.innerHTML = `
        <!-- Banner Section -->
        <section class="min-vh-100 d-flex align-items-center bg-black" style="background-image: url('/images/hero-bg.png'); background-size: cover; background-position: center; height: 100vh;">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-lg-8 col-md-8">
                    <div class="text-center ">
                        <h1 class="display-1 fw-bold text-light text-uppercase">
                        <span>Welcome</span> 
                        <span>Creator</span>
                        </h1>
                        
                        <p class="text-light">Connect your TikTok account to start tracking your post performance<br/> and monitor views, likes, and comments in real time.</p>
                    </div>
                    <div class="d-flex justify-content-center align-items-center mt-2">
                        <button type="submit" class="btn btn-lg py-2 mb-3" style="background-color: #FF0854; color: white;">
                            <div class="d-flex justify-content-center align-items-center">
                                <i class="bi bi-tiktok me-2"></i>
                                <span class="fw-semibold fs-6">SIGN IN WITH TIKTOK</span>
                            </div>
                        </button>
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
                                <p class="fw-medium">Sign Up + Otorisasi Sosial Media</p>
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
                                <p class="fw-medium">Approval Registrasi oleh Client/Agency</p>
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
                                <p class="fw-medium">Upload Draft Content</p>
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
                                <p class="fw-medium">Feedback/Approval Draft</p>
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
                                <p class="fw-medium">Upload Final Content</p>
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
                                <p class="fw-medium">Upload Link Post + Bukti Tayang</p>
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
                                <p class="fw-medium">Upload invoice pembelian + Bukti tayang R&R*</p>
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
                                <p class="fw-medium">Monitor Report Personal</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;

   renderFooterKol();
}
