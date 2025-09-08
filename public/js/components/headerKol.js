// /js/components/headerKol.js
export function renderHeaderKol(targetId = "header") {
    const container = document.getElementById(targetId);
    if (!container) return;

    const v = window.BUILD_VERSION || Date.now();

    container.innerHTML = `
    <div class="fixed-top">
      <nav class="navbar navbar-expand-lg px-3 py-2 py-lg-0" id="mainNavbar" style="min-height: 80px; height: auto;">
        <div class="container-fluid h-100">
          <div class="w-100 d-flex justify-content-between align-items-center">
            <a class="navbar-brand app-link p-2" href="/kol">
              <img src="/images/logo-white.png?v=${
                  window.BUILD_VERSION || Date.now()
              }" alt="Logo" class="img-fluid" style="max-height: 120px;">
            </a>
            <div class="d-lg-none ">
              <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#kolNavbar">
                <span class="navbar-toggler-icon" style="filter: brightness(0) invert(1);"></span>
              </button>
            </div>
          </div>

          <div class="collapse navbar-collapse" id="kolNavbar">
            <ul class="navbar-nav ms-auto mb-2 mb-lg-0 fs-6 fw-semibold">
              <li class="nav-item">
                <a href="/kol" class="nav-link text-light app-link">Home</a>
              </li>
              <li class="nav-item">
                <a class="nav-link text-light" href="#guidelines" id="guidelines-link">Guidelines</a>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </div>
  `;

    const navbar = document.getElementById("mainNavbar");

    const setBlack = () => {
        navbar.style.background = "#000";
        navbar.style.borderBottom = "1px solid rgba(255, 255, 255, 0.1)";
    };
    const setTransparent = () => {
        navbar.style.background = "transparent";
        navbar.style.borderBottom = "none";
    };

    if (location.pathname.startsWith("/kol")) {
        const handleScroll = () =>
            window.scrollY > 50 ? setBlack() : setTransparent();
        handleScroll();
        window.addEventListener("scroll", handleScroll);
    } else {
        setBlack();
    }

    const guidelinesLink = document.getElementById("guidelines-link");
    if (guidelinesLink) {
        guidelinesLink.addEventListener("click", (e) => {
            e.preventDefault();

            // If not on the /kol page, navigate there first with hash
            if (!window.location.pathname.endsWith("/kol")) {
                window.location.href = "/kol#guidelines";
                return;
            }

            // If already on /kol page, just scroll to the section
            const targetElement = document.getElementById("guidelines");
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 200,
                    behavior: "smooth",
                });
                // Update URL without page reload
                history.pushState(null, "", "#guidelines");
            }
        });
    }

    // Handle page load with hash
    const handleHashNavigation = () => {
        if (
            window.location.hash === "#guidelines" &&
            (window.location.pathname === "/kol" ||
                window.location.pathname === "/kol/")
        ) {
            const targetElement = document.getElementById("guidelines");
            if (targetElement) {
                // Small delay to ensure the page is fully rendered
                setTimeout(() => {
                    window.scrollTo({
                        top: targetElement.offsetTop - 200,
                        behavior: "smooth",
                    });
                }, 100);
            }
        }
    };

    // Check if document is already loaded
    if (document.readyState === "loading") {
        // Still loading, wait for DOMContentLoaded
        document.addEventListener("DOMContentLoaded", handleHashNavigation);
    } else {
        // DOM is already ready
        handleHashNavigation();
    }
}
