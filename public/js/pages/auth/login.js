export function render(target, params, query = {}, labelOverride = null) {
    // Sembunyikan header untuk halaman login
    const header = document.getElementById("header");
    if (header) header.style.display = "none";

    // Reset body margin dan padding untuk menghilangkan scroll
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";

    target.innerHTML = `
        <div class="vh-100 bg-light d-flex align-items-center" style="margin: 0; padding: 0;">
            <div class="container-fluid">
                <div class="row g-0">
                    <!-- Sisi Kiri - Empty Space -->
                    <div class="col-md-6">
                    </div>
                    
                    <!-- Sisi Kanan - Login Form -->
                    <div class="col-md-6 d-flex align-items-center justify-content-end" style="padding-right: 5rem;">
                        <div>
                            <div class="mb-3">
                                <h2 class="fw-semibold mb-2">Please sign in</h2>
                            </div>
                            
                            <form id="loginForm">
                                <div>
                                    <div>
                                        <input type="email" class="border rounded-top border-bottom-0" style="padding: 11px; width: 320px;" id="email" name="email" placeholder="Email address" required>
                                    </div>
                                </div>
                                
                                <div class="mb-2">
                                    <div>
                                        <input type="password" class="border rounded-bottom" style="padding: 11px; width: 320px;" id="password" name="password" placeholder="Password" required>
                                    </div>
                                </div>
                                
                                <button type="submit" class="btn" style="background: #1e2b59; color: white; padding: 11px; width: 320px;">
                                    <span>Sign in</span>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
