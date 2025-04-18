import { routes } from '../config/routes.js';

export function renderBreadcrumb(target, currentPath = window.location.pathname, labelOverride = null) {
  const rawPath = typeof currentPath === 'string' ? currentPath : window.location.pathname;
  const segments = rawPath.replace(/^\/+/, '').split('/');
  const main = '/' + segments.slice(0, 1).join('/');
  const pathSegments = rawPath.split('/').filter(Boolean);

  // Cocokkan dengan route yang punya label
  const matched = routes.find(route => {
    const routeParts = route.path.split('/').filter(Boolean);
    if (routeParts.length !== pathSegments.length) return false;

    return routeParts.every((part, idx) => part.startsWith(':') || part === pathSegments[idx]);
  });

  const routeLabel = matched?.label || '';
  const label = labelOverride || routeLabel || 'Untitled';
  const isIndex = pathSegments.length <= 1 || pathSegments[1] === '';

  // Hapus breadcrumb lama jika ada
  const old = target.querySelector('nav');
  if (old) old.remove();

  const container = document.createElement("nav");
  container.className = "mb-4 d-flex justify-content-between align-items-center";
  container.style.background = "#fff";
  container.style.padding = "1rem";
  container.style.borderRadius = "0.5rem";
  container.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";

  container.innerHTML = `
    <div>
      <ol class="breadcrumb mb-0 align-items-center">
        <li class="breadcrumb-item active d-flex align-items-center gap-2">
          <i class="bi bi-folder2-open"></i> ${label}
        </li>
      </ol>
    </div>
    <div>
      ${isIndex ? '' : `
        <button class="btn btn-outline-secondary btn-sm" onclick="navigateTo('${main}')">
          <i class="bi bi-arrow-left-circle"></i> Back
        </button>
      `}
    </div>
  `;

  target.prepend(container);
}

// Global helper navigasi
window.navigateTo = function (route) {
  history.pushState(null, '', route);
  window.dispatchEvent(new PopStateEvent('popstate'));
};
