export function renderFooterKol(targetId = "footer") {
    const container = document.getElementById(targetId);

    if (!container) return;

    const isProfilePage = window.location.pathname.includes("/my-profile");

    container.innerHTML = `
    <style>
     @media (min-width: 992px) {
        .footer-profile{
            margin-left: 350px;
            }
        }
    </style>
        <footer class="py-4 border-top shadow-lg" style="background:#fff;">
            <div class="container ${isProfilePage ? "footer-profile" : ""}">
                <div class="row">
                    <!-- Logo + About -->
                    <div class="col-md-12 mb-3">
                       
                        <p class="small mt-2">
                            A platform that helps track influencer campaign performance by monitoring views, likes, and comments across TikTok posts.
                        </p>
                    </div>

                    <!-- Quick Links -->
                    <!--div class="col-md-4 mb-3">
                        <h6 class="fw-bold">Quick Links</h6>
                        <ul class="list-unstyled small">
                            <li><a href="#guidelines" class="text-light text-decoration-none">Guidelines</a></li>
                            <li><a href="/about" class="text-light text-decoration-none">About</a></li>
                            <li><a href="/contact" class="text-light text-decoration-none">Contact</a></li>
                        </ul>
                    </div-->

                    <!-- Social Media -->
                    <!--div class="col-md-6 mb-3 d-flex flex-column justify-content-end">
                        <h6 class="fw-bold">Follow Us</h6>
                        <div class="d-flex gap-3">
                            <a href="#" class="text-light fs-5"><i class="bi bi-facebook"></i></a>
                            <a href="#" class="text-light fs-5"><i class="bi bi-instagram"></i></a>
                            <a href="#" class="text-light fs-5"><i class="bi bi-twitter-x"></i></a>
                            <a href="#" class="text-light fs-5"><i class="bi bi-linkedin"></i></a>
                        </div>
                    </div-->
                </div>

                <hr class="border-secondary">

                <!-- Bottom bar -->
                <div class="d-flex flex-column flex-md-row justify-content-between align-items-center small">
                    <span>© ${new Date().getFullYear()} Beauty Tech Lab by Group M. All rights reserved.</span>
                    <div class="mt-2 mt-md-0">
                        <a href="/terms-and-conditions" class="text-light text-decoration-none app-link me-3">Terms of Service</a>
                        <a href="/privacy-policy" class="text-light text-decoration-none app-link">Privacy Policy</a>
                    </div>
                </div>
            </div>
        </footer>
    `;
}
