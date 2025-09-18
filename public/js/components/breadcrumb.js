/* ==== Base-path helpers: auto /admin ==== */
function detectBase() {
  if (typeof window.APP_BASE === 'string') return window.APP_BASE || '';
  const m = (window.location.pathname || '').match(/^\/(admin)(?:\/|$)/i);
  return m ? `/${m[1]}` : '';
}
const BASE = detectBase();
const withBase = (p) => {
  if (!p) return BASE || '/';
  if (!p.startsWith('/')) p = '/' + p;
  if (!BASE) return p;
  return (p === '/' ? BASE : (p.startsWith(BASE + '/') || p === BASE ? p : BASE + p));
};
const stripBase = (p) => (BASE && p.startsWith(BASE) ? (p.slice(BASE.length) || '/') : p);

// Ubah HANYA jika prefix path match route exact (param allowed)
function findExactRoute(routes, segs) {
  return routes.find(r => {
    const parts = String(r.path || '').split('/').filter(Boolean);
    if (parts.length !== segs.length) return false;
    for (let i = 0; i < parts.length; i++) {
      if (!parts[i].startsWith(':') && parts[i] !== segs[i]) return false;
    }
    return true;
  });
}

export async function renderBreadcrumb(target, currentPath = window.location.pathname, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();

  // Dynamic import routes (cache-busted)
  let routes = [];
  try {
    const mod = await import(`/js/config/routes.js?v=${v}`);
    routes = mod.routes || [];
  } catch (e) {
    console.warn('[breadcrumb] gagal load routes.js', e);
  }

  const rawIn   = typeof currentPath === 'string' ? currentPath : window.location.pathname;
  const rawPath = rawIn.startsWith('/') ? stripBase(rawIn) : rawIn;
  const segs    = rawPath.split('/').filter(Boolean);

  // Bangun crumbs: hanya jika ada route EXACT utk prefix tsb
  const crumbs = [];
  for (let i = 0; i < segs.length; i++) {
    const prefix = segs.slice(0, i + 1);
    const matched = findExactRoute(routes, prefix);
    if (!matched) continue; // ⬅️ skip prefix tanpa route (misal /brands/:id tdk ada)

    let label = matched.label || prefix[i].replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    if (i === segs.length - 1 && labelOverride) label = labelOverride;

    crumbs.push({
      href: withBase('/' + prefix.join('/')),
      label,
      active: i === segs.length - 1,
    });
  }

  // Fallback root jika kosong
  if (crumbs.length === 0) {
    crumbs.push({ href: withBase('/'), label: labelOverride || 'Dashboard', active: true });
  }

  // === NEW: Inject brand name setelah label "Dashboard" jika ada ===
  try {
    const last = crumbs[crumbs.length - 1];
    // deteksi apakah ini halaman dashboard
    const isDashboardPath = /\/dashboard$/i.test(last?.href || '') || rawPath === '/' || rawPath === '/dashboard';

    if (isDashboardPath && last && typeof last.label === 'string') {
      // Ambil data me (pakai helper kalau ada, kalau tidak fallback ke fetch)
      let me = window.__ME || null;
      if (!me) {
        try {
          const auth = await import(`/js/utils/auth.js?v=${v}`);
          if (typeof auth.getMe === 'function') {
            me = await auth.getMe();
          }
        } catch {}
      }
      if (!me) {
        try {
          const res = await fetch('/api/me', { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
          if (res.ok) me = await res.json();
          window.__ME = me;
        } catch {}
      }

      const brandName = me?.brand?.name || me?.brand_name || null;
      if (brandName) {
        // Hindari duplikasi kalau sudah ada
        const alreadyHas = last.label.toLowerCase().includes(brandName.toLowerCase());
        if (!alreadyHas) {
          last.label = `${last.label} / ${brandName}`;
        }
      }
    }
  } catch (e) {
    console.warn('[breadcrumb] gagal inject brand name:', e);
  }

  // Hapus breadcrumb lama
  const old = target.querySelector('nav[data-breadcrumb]');
  if (old) old.remove();

  // Render (tanpa tombol Back; segmen non-aktif = link)
  const container = document.createElement('nav');
  container.dataset.breadcrumb = '1';
  container.className = 'mb-3 d-flex align-items-center mt-3';
  container.style.background = '#fff';
  container.style.padding = '1rem';
  container.style.borderBottomLeftRadius = '5px';
  container.style.borderBottomRightRadius = '5px';
  container.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
  container.style.borderTop = '5px solid #CCCCCC';

  const listHtml = crumbs.map(c => c.active
    ? `<li class="breadcrumb-item active d-flex align-items-center gap-2" aria-current="page">
         <i class="bi bi-folder2-open"></i> ${c.label}
       </li>`
    : `<li class="breadcrumb-item"><a class="app-link" href="${c.href}">${c.label}</a></li>`
  ).join('');

  container.innerHTML = `
    <ol class="breadcrumb mb-0 align-items-center text-uppercase">
      ${listHtml}
    </ol>
  `;

  target.prepend(container);
}

export default renderBreadcrumb;
