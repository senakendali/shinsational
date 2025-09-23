export function renderHeaderKol(targetId = "header") {
  const container = document.getElementById(targetId);
  if (!container) return;

  const v = window.BUILD_VERSION || Date.now();

  container.innerHTML = `
    <div class="fixed-top">
      <nav class="navbar navbar-expand-lg px-3 py-2 py-lg-0" id="mainNavbar" style="min-height: 80px; height: auto;">
        <div class="container-fluid h-100">
          <div class="w-100 d-flex justify-content-between align-items-center">
            <a class="navbar-brand app-link p-2" href="/">
              <img src="/images/app-logo.png?v=${v}" alt="Logo" class="img-fluid" style="max-height: 120px;">
            </a>
            <div class="d-lg-none">
              <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#kolNavbar">
                <span class="navbar-toggler-icon" style="filter: brightness(0) invert(1);"></span>
              </button>
            </div>
          </div>

          <div class="collapse navbar-collapse" id="kolNavbar">
            <ul class="navbar-nav ms-auto mb-2 mb-lg-0 fs-6 fw-semibold">
              <li class="nav-item">
                <a href="/" class="nav-link text-light app-link">Home</a>
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
  // Transition halus
  navbar.style.transition = "background-color .2s ease, border-color .2s ease";

  // helper: hapus kemungkinan class bg bawaan
  navbar.classList.remove("bg-dark", "bg-light", "bg-white", "bg-body");

  const setBlack = () => {
    navbar.style.setProperty("background-color", "#000", "important");
    navbar.style.setProperty("border-bottom", "1px solid rgba(255, 255, 255, 0.1)", "important");
  };
  const setTransparent = () => {
    navbar.style.setProperty("background-color", "transparent", "important");
    navbar.style.setProperty("border-bottom", "none", "important");
  };

  // bersihkan handler lama agar tidak dobel saat SPA re-render
  if (window.__headerScrollHandler) {
    window.removeEventListener("scroll", window.__headerScrollHandler);
    window.__headerScrollHandler = null;
  }

  const isHome = location.pathname === "/" || location.pathname === "/index.html";

  // handle scroll → solid jika >50px, transparan jika <=50px
  if (isHome) {
    const handleScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (y > 50) setBlack();
      else setTransparent();
    };
    window.__headerScrollHandler = handleScroll;

    // state awal sesuai posisi
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
  } else {
    setBlack();
  }

  // Jaga-jaga: saat resize ke very top, reset juga
  window.addEventListener("resize", () => {
    if (isHome) {
      const y = window.scrollY || 0;
      if (y <= 50) setTransparent();
    }
  }, { passive: true });

  // Collapse behaviour (mobile): buka -> hitam, tutup -> cek posisi
  const collapseEl = document.getElementById("kolNavbar");
  if (collapseEl) {
    collapseEl.addEventListener("show.bs.collapse", () => setBlack());
    collapseEl.addEventListener("hidden.bs.collapse", () => {
      if (isHome && (window.scrollY || 0) <= 50) setTransparent();
    });
  }

  // ====== Guidelines anchor ======
  const guidelinesLink = document.getElementById("guidelines-link");
  if (guidelinesLink) {
    guidelinesLink.addEventListener("click", (e) => {
      e.preventDefault();

      if (!(window.location.pathname === "/" || window.location.pathname === "/index.html")) {
        window.location.href = "/#guidelines";
        return;
      }

      const targetElement = document.getElementById("guidelines");
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 200,
          behavior: "smooth",
        });
        history.pushState(null, "", "#guidelines");
      }
    });
  }

  // Handle page load with hash
  const handleHashNavigation = () => {
    if (
      window.location.hash === "#guidelines" &&
      (window.location.pathname === "/" || window.location.pathname === "/index.html")
    ) {
      const targetElement = document.getElementById("guidelines");
      if (targetElement) {
        setTimeout(() => {
          window.scrollTo({
            top: targetElement.offsetTop - 200,
            behavior: "smooth",
          });
        }, 100);
      }
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", handleHashNavigation);
  } else {
    handleHashNavigation();
  }
}
