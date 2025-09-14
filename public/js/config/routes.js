const BUILD_ID = window.BUILD_VERSION || Date.now();
export const routes = [
    {
        path: "/",
        label: "Home",
        component: () => import("../pages/kol/index.js?v=" + BUILD_ID),
    },
    // Dashboard
    {
        path: "/admin/dashboard",
        label: "Dashboard",
        component: () => import("../pages/dashboard.js?v=" + BUILD_ID),
    },

    // Brand
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

    // Campaign
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

    // Submission
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




    // Pengguna
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

    // Role
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

    // Permission
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

    // User
    {
        path: "/admin/users",
        label: "Users",
        component: () => import("../pages/users/index.js?v=" + BUILD_ID),
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

    // Pengaturan Sistem
    {
        path: "/settings",
        label: "Settings",
        component: () => import("../pages/settings/index.js?v=" + BUILD_ID),
    },

    // Fallback 404
    {
        path: "*",
        component: () => import("../pages/not-found.js?v=" + BUILD_ID),
    },

    // Login
    {
        path: "/admin/login",
        label: "Login",
        component: () => import("../pages/auth/login.js?v=" + BUILD_ID),
    },

    // Profile
   /* {
        path: "/my-profile",
        label: "My Profile",
        component: () => import("../pages/profile/index.js?v=" + BUILD_ID),
    },*/

    // Kol
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
