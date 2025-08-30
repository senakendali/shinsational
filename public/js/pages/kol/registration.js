export function render(target, params, query = {}, labelOverride = null) {
    const header = document.getElementById("header");
    if (header) header.style.display = "none";
    target.innerHTML = `
    <section class="min-vh-100 d-flex align-items-center">
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-lg-5 col-md-8">
                        
                            <div class="card ">
                                <div class="bg-black rounded-top d-inline-flex justify-content-center align-items-center">
                                    <img src="/images/loreal.png" alt="Logo" style="height: 200px; width: 200px; ">
                                </div>
                                <div class="card-body p-4 p-md-5 ">
                                    <div class="text-center mb-4">
                                    <h2 class="fw-semibold mb-3">Please sign in to your TikTok account</h2>
                                </div>
                                <form id="loginForm" class="needs-validation" novalidate>
                                   
                                        <button type="submit" class="btn btn-dark btn-lg w-100 py-2 mb-3">
                                            <div class="d-flex justify-content-center">
                                                <i class="bi bi-tiktok me-2"></i>
                                                <span>Sign in with TikTok</span>
                                            </div>
                                        </button>
                                    
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}
