import { renderNavbar } from "./navbar.js";

export function renderHeader(targetId = "header") {
    const container = document.getElementById(targetId);
    if (!container) return;

    container.innerHTML = `
        <div class="shrinkable-navbar app-header">
            <!-- Bar Atas -->
            <div class="border-bottom py-2 px-3">
                <div class="container-fluid d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-4">
                        <a class="navbar-brand" href="#">
                            <img src="/images/logo-admin.png" alt="Logo" class="d-inline-block align-text-top logo">
                        </a>
                    </div>
                    <div class="d-flex align-items-center gap-3 flex-grow-1 justify-content-end">
                    <nav class="navbar navbar-expand-lg">
                <div class="container-fluid">
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav ms-auto" id="navbar-menu">
                            <!-- akan di-render oleh navbar.js -->
                        </ul>
                    </div>
                </div>
            </nav>
                        <!--form class="d-flex flex-grow-1" role="search" style="max-width: 500px;">
                            <input class="form-control" type="search" placeholder="Search" aria-label="Search">
                        </form>
                       
                        <div class="dropdown">
                            <a class="nav-link d-flex align-items-center gap-2" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="bi bi-person-vcard"></i>
                            </a>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><a class="dropdown-item" href="/my-profile">Profil Saya</a></li>
                                <li><a class="dropdown-item text-danger" href="#"><i class="bi bi-box-arrow-right me-2"></i> Logout</a></li>
                            </ul>
                        </div-->
                    </div>
                </div>
            </div>

            <!-- Bar Navigasi -->
            
        </div>
    `;

    renderNavbar();
}
