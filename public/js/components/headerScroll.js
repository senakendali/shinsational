// Controller global: hanya pasang satu scroll listener untuk semua halaman SPA
let _navbarScrollInstalled = false;

function getNavbar() {
    return document.getElementById("mainNavbar");
}
function solid(nav) {
    nav.classList.add("is-solid");
    nav.classList.remove("is-transparent");
}
function transparent(nav) {
    nav.classList.add("is-transparent");
    nav.classList.remove("is-solid");
}

/**
 * Set state sesuai URL & posisi scroll SEKARANG.
 * - /kol   : transparan di top, hitam saat scroll > 50
 * - selain : selalu hitam (lock)
 */
export function applyNavbarBackgroundNow() {
    const nav = getNavbar();
    if (!nav) return;

    const isKol = location.pathname === "/kol";

    // Bersihkan lock dulu, nanti dipasang lagi bila non-/kol
    nav.classList.remove("is-locked-solid");

    if (isKol) {
        // /kol → tergantung scroll
        if (window.scrollY > 50) solid(nav);
        else transparent(nav);
    } else {
        // Non-/kol → selalu hitam + lock
        nav.classList.add("is-locked-solid");
        solid(nav);
    }
}

/**
 * Pasang listener scroll sekali saja untuk seluruh hidup SPA.
 * Listener ini selalu cek path saat scroll, jadi aman walau route berganti.
 */
export function installNavbarBackgroundController() {
    if (_navbarScrollInstalled) return;
    _navbarScrollInstalled = true;

    window.addEventListener(
        "scroll",
        () => {
            const nav = getNavbar();
            if (!nav) return;

            // Jika sedang di-lock (non-/kol), paksa tetap solid
            if (nav.classList.contains("is-locked-solid")) {
                solid(nav);
                return;
            }

            // Mode /kol → toggle berdasarkan scroll
            if (location.pathname.startsWith("/kol")) {
                if (window.scrollY > 50) solid(nav);
                else transparent(nav);
            } else {
                // Safety net: non-/kol tetap solid
                nav.classList.add("is-locked-solid");
                solid(nav);
            }
        },
        { passive: true }
    );

    // Apply state awal
    applyNavbarBackgroundNow();
}
