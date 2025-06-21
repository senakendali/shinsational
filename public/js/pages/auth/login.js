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
                            </div>
                            
                            <!-- Sisi Kanan - Login Form -->
                            <div class="col-md-6 d-flex align-items-center">
                                <div class="p-4 p-lg-5 w-100">
                                    <div class="mb-3">
                                        <h2 class="fw-semibold mb-2">Please sign in</h2>
                                    </div>
                                    
                                    <form id="loginForm">
                                        <div>
                                            <div>
                                                <input type="email" class="border rounded-top border-bottom-0 w-75" style="padding: 11px;" id="email" name="email" placeholder="Email address" required>
                                            </div>
                                        </div>
                                        
                                        <div class="mb-2">
                                            <div>
                                                <input type="password" class="border rounded-bottom w-75" style="padding: 11px;" id="password" name="password" placeholder="Password" required>
                                            </div>
                                        </div>
                                        
                                        <button type="submit" class="btn w-75" style="background: #1e2b59; color: white; padding: 11px;">
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
