import { renderBreadcrumb } from "../../components/breadcrumb.js";
import { authService } from "../../services/authService.js";
import { showToast } from "../../utils/toast.js";
import { clearAllErrors, showValidationErrors } from "../../utils/form.js";

export function render(target, params, query = {}, labelOverride = null) {
    // Sembunyikan header untuk halaman login
    const header = document.getElementById("header");
    if (header) header.style.display = "none";

    target.innerHTML = `
        <div class="container-fluid vh-100 bg-light">
            <div class="row h-100 justify-content-center align-items-center">
                <div class="col-lg-10 col-xl-8">
                    <div class=" style="overflow: hidden;">
                        <div class="row g-0">
                            <!-- Sisi Kiri - Empty Image Blank -->
                            <div class="col-md-6 d-flex align-items-center justify-content-center" style="min-height: 500px;">
                            // Img Blank
                            </div>
                            
                            <!-- Sisi Kanan - Login Form -->
                            <div class="col-md-6 d-flex align-items-center">
                                <div class="p-4 p-lg-5 w-100">
                                    <div class="mb-4">
                                        <h2 class="fw-semibold mb-2">Please sign in</h2>
                                    </div>
                                    
                                    <form id="loginForm">
                                        <div class="mb-3">
                                            <div>
                                                <input type="email" class="form-control" id="email" name="email" placeholder="Email address" required>
                                            </div>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <div>
                                                <input type="password" class="form-control" id="password" name="password" placeholder="Password" required>
                                            </div>
                                        </div>
                                        
                                        <button type="submit" class="btn w-100 mb-3 fw-semibold" style="background: #6366f1; color: white; border-radius: 8px;">
                                            <span>Sign in</span>
                                        </button>
                                    </form>
                                    
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
