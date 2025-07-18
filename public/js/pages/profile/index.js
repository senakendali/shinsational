import { renderBreadcrumb } from "../../components/breadcrumb.js";
import { showLoader, hideLoader } from "../../components/loader.js";

export async function render(target, path, params = {}, labelOverride = null) {
    showLoader();
    target.innerHTML = "";
    renderBreadcrumb(target, path, "User Profile");

    // 🚧 Dummy user - nanti ganti dari session/localStorage/API
    const user = {
        name: "John Doe",
        email: "john@example.com",
        phone: "(239) 816-9029",
        mobile: "(320) 380-4539",
        address: "Bay Area, San Francisco, CA",
        role: "Full Stack Developer",
        location: "Bay Area, San Francisco, CA",
        profilePicture:
            "https://ui-avatars.com/api/?name=John+Doe&background=random&color=fff",
        socials: {
            website: "https://bootdey.com",
            github: "bootdey",
            twitter: "@bootdey",
            instagram: "bootdey",
            facebook: "bootdey",
        },
        projects: [
            { name: "Web Design", progress: 50 },
            { name: "Website Markup", progress: 70 },
            { name: "One Page", progress: 90 },
            { name: "Mobile Template", progress: 40 },
            { name: "Backend API", progress: 60 },
        ],
    };

    const renderProgress = () =>
        user.projects
            .map(
                (p) => `
                <p class="mb-1">${p.name}</p>
                <div class="progress mb-3">
                    <div class="progress-bar bg-primary" role="progressbar" style="width: ${p.progress}%;">
                        ${p.progress}%
                    </div>
                </div>`
            )
            .join("");

    target.innerHTML += `
    <div class="row">
        <!-- Sidebar -->
        <div class="col-md-4">
            <div class="card mb-3">
                <div class="card-body text-center">
                    <img src="${
                        user.profilePicture
                    }" alt="avatar" class="rounded-circle mb-3" width="100">
                    <h5 class="mb-1">${user.name}</h5>
                    <p class="text-muted mb-1">${user.role}</p>
                    <p class="text-muted small">${user.location}</p>
                    <div class="d-flex justify-content-center gap-2 mt-3">
                        <button class="btn btn-primary btn-sm">Follow</button>
                        <button class="btn btn-outline-primary btn-sm">Message</button>
                    </div>
                </div>
            </div>
            <div class="card">
                <ul class="list-group list-group-flush">
                    <li class="list-group-item"><i class="bi bi-globe me-2"></i> Website: ${
                        user.socials.website
                    }</li>
                    <li class="list-group-item"><i class="bi bi-github me-2"></i> Github: ${
                        user.socials.github
                    }</li>
                    <li class="list-group-item"><i class="bi bi-twitter me-2"></i> Twitter: ${
                        user.socials.twitter
                    }</li>
                    <li class="list-group-item"><i class="bi bi-instagram me-2"></i> Instagram: ${
                        user.socials.instagram
                    }</li>
                    <li class="list-group-item"><i class="bi bi-facebook me-2"></i> Facebook: ${
                        user.socials.facebook
                    }</li>
                </ul>
            </div>
        </div>

        <!-- Main Profile Info -->
        <div class="col-md-8">
            <div class="card mb-3">
                <div class="card-body">
                    ${[
                        ["Full Name", user.name],
                        ["Email", user.email],
                        ["Phone", user.phone],
                        ["Mobile", user.mobile],
                        ["Address", user.address],
                    ]
                        .map(
                            ([label, value]) => `
                        <div class="row mb-3">
                            <div class="col-sm-4"><strong>${label}</strong></div>
                            <div class="col-sm-8 text-secondary">${value}</div>
                        </div>`
                        )
                        .join("")}
                </div>
            </div>

            <!-- Project Status -->
            <div class="row">
                <div class="col-md-6">
                    <div class="card p-3">
                        <h6><span class="text-primary fw-semibold">assignment</span> Project Status</h6>
                        ${renderProgress()}
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card p-3">
                        <h6><span class="text-primary fw-semibold">assignment</span> Project Status</h6>
                        ${renderProgress()}
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    hideLoader();
}
