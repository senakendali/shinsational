export function renderHeaderKol(targetId = "header") {
    const container = document.getElementById(targetId);
    if (!container) return;

    container.innerHTML = `
        <div class="fixed-top" ">
                <nav class="navbar navbar-expand-lg px-3" id="mainNavbar" style="height: 160px;">
                    <!-- Logo on the left -->
                    <a class="navbar-brand" href="/">
                        <img src="/images/loreal-2.png" alt="Logo" >
                    </a>
                    
                    <!-- Mobile menu button -->
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#kolNavbar">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    
                    <!-- Navigation links on the right -->
                    <div class="collapse navbar-collapse" id="kolNavbar">
                        <ul class="navbar-nav ms-auto mb-2 mb-lg-0 fs-6 fw-semibold">
                            <li class="nav-item ">
                                <a href="/kol" class="nav-link text-light app-link">Home</a>
                            </li>
                            <li class="nav-item ">
                                <a class="nav-link text-light" href="#guidelines" id="guidelines-link">Guidelines</a>
                            </li>
                            <!--li class="nav-item">
                                <a class="nav-link text-light" href="/kol/registration">Registration</a>
                            </li>
                            
                            <li class="nav-item dropdown">
                                <a class="nav-link dropdown-toggle d-flex align-items-center text-light" href="#" id="profileDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                    
                                    <span>Profile</span>
                                </a>
                                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="profileDropdown">
                                    <li><a class="dropdown-item" href="/profile">My Profile</a></li>
                                    <li><a class="dropdown-item" href="/settings">Settings</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger" href="/logout">
                                        <i class="bi bi-box-arrow-right me-2"></i>Logout
                                    </a></li>
                                </ul>
                            </li-->
                        </ul>
                    </div>
                </nav>
        </div>
    `;

    const navbar = document.getElementById("mainNavbar");

    

    function setBlack() {
        navbar.style.background = "#000";
        navbar.style.borderBottom = "1px solid rgba(255, 255, 255, 0.1)";
    }

    function setTransparent() {
        navbar.style.background = "transparent";
        navbar.style.borderBottom = "none";
    }

    // Cek URL
    if (location.pathname.startsWith("/kol")) {
        // Mode KOL → transparan awal, berubah saat scroll
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setBlack();
            } else {
                setTransparent();
            }
        };

        handleScroll();
        window.addEventListener("scroll", handleScroll);
    } else {
        // Bukan halaman /kol → selalu hitam
        setBlack();
    }


    const guidelinesLink = document.getElementById("guidelines-link");
    if (guidelinesLink) {
        guidelinesLink.addEventListener("click", (e) => {
            e.preventDefault();
            const targetElement = document.getElementById("guidelines");
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 400,
                    behavior: "smooth",
                });
            }
        });
    }
}
