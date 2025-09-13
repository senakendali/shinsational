import { routes } from '../config/routes.js';

/* ==== Base-path helpers: auto /admin ==== */
function detectBase() {
  if (typeof window.APP_BASE === 'string') return window.APP_BASE || '';
  const m = (window.location.pathname || '').match(/^\/(admin)(?:\/|$)/i);
  return m ? `/${m[1]}` : '';
}
const BASE = detectBase();
const withBase  = (p) => {
  if (!p) return BASE || '/';
  if (!p.startsWith('/')) p = '/' + p;
  if (!BASE) return p;
  return (p === '/' ? BASE : (p.startsWith(BASE + '/') || p === BASE ? p : BASE + p));
};
const stripBase = (p) => (BASE && p.startsWith(BASE) ? (p.slice(BASE.length) || '/') : p);

export function renderBreadcrumb(target, currentPath = window.location.pathname, labelOverride = null) {
  const rawIn   = typeof currentPath === 'string' ? currentPath : window.location.pathname;
  const rawPath = rawIn.startsWith('/') ? stripBase(rawIn) : rawIn;

  const pathSegments = rawPath.split('/').filter(Boolean);
  const firstSeg = pathSegments[0] || '';
  const main = '/' + firstSeg;           // contoh: '/brands'
  const isIndex = pathSegments.length <= 1;

  // match label dari routes (routes tanpa /admin)
  const matched = routes.find(route => {
    const routeParts = route.path.split('/').filter(Boolean);
    if (routeParts.length !== pathSegments.length) return false;
    return routeParts.every((part, idx) => part.startsWith(':') || part === pathSegments[idx]);
  });

  const routeLabel = matched?.label || '';
  const label = labelOverride || routeLabel || 'Untitled';

  // hapus breadcrumb lama
  const old = target.querySelector('nav');
  if (old) old.remove();

  // gunakan <a> dengan href yang sudah di-withBase, + .app-link agar SPA menangkap klik
  const backHref = withBase(main);

  const container = document.createElement('nav');
  container.className = 'mb-3 d-flex justify-content-between align-items-center';
  container.style.background = '#fff';
  container.style.padding = '1rem';
  container.style.borderRadius = '0.5rem';
  container.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';

  container.innerHTML = `
    <div>
      <ol class="breadcrumb mb-0 align-items-center text-uppercase">
        <li class="breadcrumb-item active d-flex align-items-center gap-2">
          <i class="bi bi-folder2-open"></i> ${label}
        </li>
      </ol>
    </div>
    <div>
      ${isIndex ? '' : `
        <a class="btn btn-outline-secondary btn-sm app-link" href="${backHref}">
          <i class="bi bi-arrow-left-circle"></i> Back
        </a>
      `}
    </div>
  `;

  target.prepend(container);
}
