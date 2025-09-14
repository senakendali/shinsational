// /js/components/navbar.js
export async function renderNavbar(containerOrEl = '#navbar-menu', pathOverride = null) {
  const v = window.BUILD_VERSION || Date.now();

  // Resolve container: boleh CSS selector atau langsung element
  const container = (typeof containerOrEl === 'string')
    ? document.querySelector(containerOrEl)
    : containerOrEl;

  if (!container) return;

  // ==== GUARD anti double-render cepat (race) ====
  if (container.dataset.navRendering === '1') return;
  container.dataset.navRendering = '1';

  // ==== Permission helpers ====
  async function getAbilities() {
    if (window.__ABILITIES_SET instanceof Set) return window.__ABILITIES_SET;

    // 1) pakai preload global kalau ada
    if (Array.isArray(window.ABILITIES)) {
      window.__ABILITIES_SET = new Set(window.ABILITIES);
      return window.__ABILITIES_SET;
    }

    // 2) fallback: fetch /api/me (butuh backend yang sediakan abilities)
    try {
      const res = await fetch('/api/me', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      if (res.ok) {
        const me = await res.json();
        window.__ABILITIES_SET = new Set(Array.isArray(me.abilities) ? me.abilities : []);
        return window.__ABILITIES_SET;
      }
    } catch (e) {
      // ignore
    }

    // 3) gagal → set kosong (sembunyikan item yang butuh permission)
    window.__ABILITIES_SET = new Set();
    return window.__ABILITIES_SET;
  }

  function canShow(spec, abilities) {
    if (!spec) return true;                 // tanpa can => tampil
    if (Array.isArray(spec)) {
      // OR: punya salah satu permission
      return spec.some(p => abilities.has(p));
    }
    return abilities.has(spec);
  }

  try {
    // Pastikan target UL ada
    let hostUL = container;
    if (hostUL.tagName?.toLowerCase() !== 'ul') {
      hostUL = container.querySelector('ul#navbar-menu') || container.querySelector('ul');
      if (!hostUL) {
        hostUL = document.createElement('ul');
        hostUL.id = 'navbar-menu';
        container.appendChild(hostUL);
      }
    }

    // Kelas standar
    hostUL.classList.add('navbar-nav', 'ms-auto');

    // Bersihkan isi
    while (hostUL.firstChild) hostUL.removeChild(hostUL.firstChild);

    // Ambil menu realtime
    let ownerMenu = [];
    try {
      const mod = await import(`/js/config/menu.js?v=${v}`);
      ownerMenu = mod.ownerMenu || mod.default || [];
    } catch (e) {
      console.error('[navbar] Failed to import menu.js', e);
      // fallback minimal
      ownerMenu = [
        { label: 'Dashboard', path: '/admin/dashboard', icon: 'bi-speedometer2', can: ['dashboard.view', 'dashboard.viewAny'] },
      ];
    }

    // Path aktif
    const normalize = (p) => (String(p || '').replace(/\/+$/, '') || '/');
    let currentPath = typeof pathOverride === 'string' ? pathOverride : window.location.pathname;
    currentPath = normalize(currentPath);
    const isActive = (p) => normalize(p) === currentPath;

    // Filter by permission
    const abilities = await getAbilities();
    const filteredMenu = ownerMenu
      .map(item => {
        if (Array.isArray(item.children) && item.children.length) {
          const children = item.children.filter(ch => canShow(ch.can, abilities));
          if (!children.length && !canShow(item.can, abilities)) return null; // parent & all children hidden
          return { ...item, children };
        }
        return canShow(item.can, abilities) ? item : null;
      })
      .filter(Boolean);

    // Helper DOM
    const makeLI = (...cls) => {
      const li = document.createElement('li');
      li.className = ['nav-item', ...cls].filter(Boolean).join(' ');
      return li;
    };
    const makeLink = (href, html, cls = '') => {
      const a = document.createElement('a');
      a.href = href || '#';
      a.className = cls;
      a.innerHTML = html;
      return a;
    };

    // Render items
    filteredMenu.forEach((item) => {
      if (Array.isArray(item.children) && item.children.length) {
        const li = makeLI('dropdown');

        const toggle = makeLink(
          '#',
          `${item.icon ? `<i class="bi ${item.icon}"></i>` : ''} ${item.label}`,
          'nav-link dropdown-toggle d-flex align-items-center gap-2'
        );
        toggle.setAttribute('role', 'button');
        toggle.setAttribute('data-bs-toggle', 'dropdown');
        toggle.setAttribute('aria-expanded', 'false');

        const dropdown = document.createElement('ul');
        dropdown.className = 'dropdown-menu dropdown-menu-end';

        let anyActive = false;
        item.children.forEach((child) => {
          const childLi = document.createElement('li');
          const childA = makeLink(
            child.path,
            `${child.icon ? `<i class="bi ${child.icon}"></i>` : ''} ${child.label}`,
            'dropdown-item d-flex align-items-center gap-2 app-link'
          );
          childA.setAttribute('data-href', child.path);
          if (isActive(child.path)) {
            childA.classList.add('active');
            anyActive = true;
          }
          childLi.appendChild(childA);
          dropdown.appendChild(childLi);
        });

        if (anyActive) toggle.classList.add('active');

        li.appendChild(toggle);
        li.appendChild(dropdown);
        hostUL.appendChild(li);
      } else {
        const li = makeLI();
        const a = makeLink(
          item.path,
          `${item.icon ? `<i class="bi ${item.icon}"></i>` : ''} ${item.label}`,
          'nav-link d-flex align-items-center gap-2 app-link'
        );
        a.setAttribute('data-href', item.path);
        if (isActive(item.path)) a.classList.add('active');
        li.appendChild(a);
        hostUL.appendChild(li);
      }
    });

    // Logout
    const logoutLi = makeLI();
    logoutLi.innerHTML = `
      <a class="nav-link d-flex align-items-center gap-2" href="#" id="logoutNavLink">
        <i class="bi bi-box-arrow-right"></i> Logout
      </a>
    `;
    hostUL.appendChild(logoutLi);

    // === SPA nav: DELEGASI pada UL (hindari multi-binding per render) ===
    if (hostUL._onNavClick) hostUL.removeEventListener('click', hostUL._onNavClick);
    hostUL._onNavClick = (e) => {
      const a = e.target.closest('a.app-link');
      if (!a) return;
      const href = a.getAttribute('data-href') || a.getAttribute('href');
      if (!href || href === '#') return;
      e.preventDefault();
      history.pushState(null, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    };
    hostUL.addEventListener('click', hostUL._onNavClick);

    // Logout
    const logoutLink = hostUL.querySelector('#logoutNavLink');
    if (logoutLink) {
      if (logoutLink._onClick) logoutLink.removeEventListener('click', logoutLink._onClick);
      logoutLink._onClick = async (e) => {
        e.preventDefault();
        try {
          await fetch('/logout', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
          });
        } catch (_e) {
          /* ignore */
        } finally {
          location.href = '/admin/login';
        }
      };
      logoutLink.addEventListener('click', logoutLink._onClick);
    }

  } finally {
    // Lepas guard
    container.dataset.navRendering = '0';
  }
}

export default renderNavbar;
