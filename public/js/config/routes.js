// /js/router/routes.js
const BUILD_ID = window.BUILD_VERSION || Date.now();

/** Pakai getMe() versi kamu; gunakan global kalau sudah tersedia */
async function getMe() {
  if (window.__ME && typeof window.__ME === 'object') return window.__ME;
  try {
    const res = await fetch('/api/me', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    if (!res.ok) throw new Error('not ok');
    const me = await res.json();
    window.__ME = me || {};
    if (Array.isArray(me?.abilities)) {
      window.__ABILITIES_SET = new Set(me.abilities);
    }
    return window.__ME;
  } catch {
    window.__ME = null;
    return null;
  }
}

/** Helper: cek ability/permission */
function hasAbility(me, abilityName) {
  if (!me) return false;
  if (window.__ABILITIES_SET instanceof Set && window.__ABILITIES_SET.has(abilityName)) {
    return true;
  }
  // fallback kalau me.abilities bukan Set
  if (Array.isArray(me.abilities) && me.abilities.includes(abilityName)) {
    return true;
  }
  // fallback terakhir: cek me.permissions (nama permission)
  const perms = Array.isArray(me.permissions) ? me.permissions.map(p => p?.name ?? p) : [];
  return perms.includes(abilityName);
}

export const routes = [
  {
    path: "/",
    label: "Home",
    component: () => import("../pages/kol/index.js?v=" + BUILD_ID),
  },

  // ===== Dashboard (auto-pick: admin vs brand) =====
  {
    path: "/admin/dashboard",
    label: "Dashboard",
    component: async () => {
      const me = await getMe();
      if (!me) {
        return import("../pages/not-found.js?v=" + BUILD_ID);
      }

      if (hasAbility(me, "dashboard.viewAny")) {
        // Admin dashboard
        return import("../pages/dashboard.js?v=" + BUILD_ID);
      }

      if (hasAbility(me, "dashboard.view")) {
        // Brand dashboard → seed brand id dari /api/me agar modul bisa filter
        window.__BRAND_ID = me?.brand?.id ?? me?.brand_id ?? null;
        return import("../pages/dashboard-brand.js?v=" + BUILD_ID);
      }

      // Nggak punya ability apa pun
      return import("../pages/not-found.js?v=" + BUILD_ID);
    },
  },

  // ===== Brand =====
  {
    path: "/admin/brands",
    label: "Brand",
    component: () => import("../pages/brand/index.js?v=" + BUILD_ID),
  },
  {
    path: "/admin/brands/create",
    label: "Add Brand",
    component: () => import("../pages/brand/form.js?v=" + BUILD_ID),
  },
  {
    path: "/admin/brands/:id/edit",
    label: "Edit Brand",
    component: () => import("../pages/brand/form.js?v=" + BUILD_ID),
  },

  // ===== Campaign =====
  {
    path: "/admin/campaigns",
    label: "Campaign",
    component: () => import("../pages/campaign/index.js?v=" + BUILD_ID),
  },
  {
    path: "/admin/campaigns/create",
    label: "Add Campaign",
    component: () => import("../pages/campaign/form.js?v=" + BUILD_ID),
  },
  {
    path: "/admin/campaigns/:id/edit",
    label: "Edit Campaign",
    component: () => import("../pages/campaign/form.js?v=" + BUILD_ID),
  },

  {
    path: "/admin/drafts",
    label: "Content Approval",
    component: () => import("../pages/submission/draft.js?v=" + BUILD_ID),
  },

  {
    path: "/admin/kol",
    label: "KOL",
    component: () => import("../pages/kol/kol-list.js?v=" + BUILD_ID),
  },

  // ===== Submission =====
  {
    path: "/admin/submissions",
    label: "Submission",
    component: () => import("../pages/submission/index.js?v=" + BUILD_ID),
  },
  {
    path: "/admin/submissions/create",
    label: "Add Campaign",
    component: () => import("../pages/submission/form.js?v=" + BUILD_ID),
  },
  {
    path: "/admin/submissions/:id/edit",
    label: "Edit Campaign",
    component: () => import("../pages/submission/form.js?v=" + BUILD_ID),
  },

  // ===== Legal =====
  {
    path: "/terms-and-conditions",
    label: "Term and Conditions",
    component: () => import("../pages/terms/index.js?v=" + BUILD_ID),
  },
  {
    path: "/privacy-policy",
    label: "Privacy Policy",
    component: () => import("../pages/privacy/index.js?v=" + BUILD_ID),
  },

  // ===== Users (non-admin path)
  {
    path: "/users",
    label: "Users",
    component: () => import("../pages/users/index.js?v=" + BUILD_ID),
  },
  {
    path: "/users/create",
    label: "Create User",
    component: () => import("../pages/users/form.js?v=" + BUILD_ID),
  },
  {
    path: "/users/:id/edit",
    label: "Edit User",
    component: () => import("../pages/users/form.js?v=" + BUILD_ID),
  },

  // ===== Role =====
  {
    path: "/admin/roles",
    label: "Roles",
    component: () => import("../pages/roles/index.js?v=" + BUILD_ID),
  },
  {
    path: "/admin/roles/create",
    label: "Create Role",
    component: () => import("../pages/roles/form.js?v=" + BUILD_ID),
  },
  {
    path: "/admin/roles/:id/edit",
    label: "Edit Role",
    component: () => import("../pages/roles/form.js?v=" + BUILD_ID),
  },

  // ===== Permission =====
  {
    path: "/admin/permissions",
    label: "Permissions",
    component: () => import("../pages/permissions/index.js?v=" + BUILD_ID),
  },
  {
    path: "/admin/permissions/create",
    label: "Create Permission",
    component: () => import("../pages/permissions/form.js?v=" + BUILD_ID),
  },
  {
    path: "/admin/permissions/:id/edit",
    label: "Edit Permission",
    component: () => import("../pages/permissions/form.js?v=" + BUILD_ID),
  },

  // ===== User (admin namespace)
  {
    path: "/admin/users",
    label: "Users",
    component: () => import("../pages/users/index.js?v=" + BUILD_ID),
  },
  {
    path: "/admin/profile",
    label: "Profile",
    component: () => import("../pages/users/profile.js?v=" + BUILD_ID),
  },
  {
    path: "/admin/users/create",
    label: "Create User",
    component: () => import("../pages/users/form.js?v=" + BUILD_ID),
  },
  {
    path: "/admin/users/:id/edit",
    label: "Edit User",
    component: () => import("../pages/users/form.js?v=" + BUILD_ID),
  },

  // ===== Settings =====
  {
    path: "/settings",
    label: "Settings",
    component: () => import("../pages/settings/index.js?v=" + BUILD_ID),
  },

  // ===== 404 =====
  {
    path: "*",
    component: () => import("../pages/not-found.js?v=" + BUILD_ID),
  },

  // ===== Auth =====
  {
    path: "/admin/login",
    label: "Login",
    component: () => import("../pages/auth/login.js?v=" + BUILD_ID),
  },

  // ===== KOL =====
  {
    path: "/kol",
    label: "KOL",
    component: () => import("../pages/kol/index.js?v=" + BUILD_ID),
  },
  {
    path: "/registration",
    label: "KOL Registration",
    component: () => import("../pages/kol/registration.js?v=" + BUILD_ID),
  },
  {
    path: "/my-profile",
    label: "My Profile",
    component: () => import("../pages/kol/profile.js?v=" + BUILD_ID),
  },
];
