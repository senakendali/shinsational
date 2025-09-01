export function render(target, params, query = {}, labelOverride = null) {
    const header = document.getElementById("header");
    if (header) header.style.display = "none";
    target.innerHTML = `
<section class="min-vh-100 d-flex align-items-center">
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-lg-5 col-md-8">
                <div class="card">
                    <div class="bg-black rounded-top d-inline-flex justify-content-center align-items-center">
                        <img src="/images/loreal.png" alt="Logo" style="height: 200px; width: 200px;">
                    </div>
                    <div class="card-body p-4 p-md-5">
                        <div class="text-center mb-4">
                            <h2 class="fw-semibold mb-3 fs-4">Please Fill Your Information</h2>
                        </div>
                        <form id="registerForm" class="needs-validation w-100" novalidate>
                            <div class="d-flex flex-column gap-3">
                                <div class="form-group">
                                    <input type="text" class="form-control form-control-lg" id="fullName" name="fullName" placeholder="Full Name" required>
                                </div>
                                <div class="form-group">
                                    <input type="number" class="form-control form-control-lg" id="phone" name="phone" placeholder="Phone Number" required>
                                </div>
                                <div class="form-group">
                                    <input type="text" class="form-control form-control-lg" id="address" name="address" placeholder="Address" required>
                                </div>
                                <div class="form-group">
                                    <input type="number" class="form-control form-control-lg" id="authCode" name="authCode" placeholder="TikTok Authorization Code" required>
                                </div>
                                <div class="form-group">
                                    <input type="date" class="form-control form-control-lg" id="birthDate" name="birthDate" placeholder="Birth Date" required>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-dark btn-lg w-100 py-2 mt-3 fw-semibold">
                                Register
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
