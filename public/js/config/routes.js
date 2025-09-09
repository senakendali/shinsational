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

    // Proyek
    {
        path: "/projects",
        label: "Projects",
        component: () => import("../pages/projects/index.js?v=" + BUILD_ID),
    },
    {
        path: "/projects/create",
        label: "Create Project",
        component: () => import("../pages/projects/form.js?v=" + BUILD_ID),
    },
    {
        path: "/projects/:id/edit",
        label: "Edit Project",
        component: () => import("../pages/projects/form.js?v=" + BUILD_ID),
    },
    {
        path: "/project-terms",
        label: "Project Terms",
        component: () =>
            import("../pages/project-terms/index.js?v=" + BUILD_ID),
    },
    {
        path: "/project-terms/create",
        label: "Create Project Term",
        component: () => import("../pages/project-terms/form.js?v=" + BUILD_ID),
    },
    {
        path: "/project-terms/:id/edit",
        label: "Edit Project Term",
        component: () => import("../pages/project-terms/form.js?v=" + BUILD_ID),
    },
    {
        path: "/project-terms/:id/invoice",
        label: "Invoice",
        component: () =>
            import("../pages/project-terms/invoice.js?v=" + BUILD_ID),
    },

    // Klien
    {
        path: "/clients",
        label: "Clients",
        component: () => import("../pages/clients/index.js?v=" + BUILD_ID),
    },
    {
        path: "/clients/create",
        label: "Create Client",
        component: () => import("../pages/clients/form.js?v=" + BUILD_ID),
    },
    {
        path: "/clients/:id/edit",
        label: "Edit Client",
        component: () => import("../pages/clients/form.js?v=" + BUILD_ID),
    },

    // Pemasukan
    {
        path: "/incomes",
        label: "Incomes",
        component: () => import("../pages/incomes/index.js?v=" + BUILD_ID),
    },
    {
        path: "/incomes/create",
        label: "Create Income",
        component: () => import("../pages/incomes/form.js?v=" + BUILD_ID),
    },
    {
        path: "/incomes/:id/edit",
        label: "Edit Income",
        component: () => import("../pages/incomes/form.js?v=" + BUILD_ID),
    },
    {
        path: "/incomes/projects",
        label: "Project Incomes",
        component: () => import("../pages/incomes/projects.js?v=" + BUILD_ID),
    },
    {
        path: "/incomes/others",
        label: "Other Incomes",
        component: () => import("../pages/incomes/others.js?v=" + BUILD_ID),
    },

    // Pengeluaran
    {
        path: "/expenses",
        label: "Expenses",
        component: () => import("../pages/expenses/index.js?v=" + BUILD_ID),
    },
    {
        path: "/expenses/create",
        label: "Create Expense",
        component: () => import("../pages/expenses/form.js?v=" + BUILD_ID),
    },
    {
        path: "/expenses/:id/edit",
        label: "Edit Expense",
        component: () => import("../pages/expenses/form.js?v=" + BUILD_ID),
    },
    {
        path: "/expenses/operational",
        label: "Operational Expenses",
        component: () =>
            import("../pages/expenses/operational.js?v=" + BUILD_ID),
    },
    {
        path: "/expenses/payroll",
        label: "Payroll Expenses",
        component: () => import("../pages/expenses/payroll.js?v=" + BUILD_ID),
    },
    {
        path: "/expenses/project",
        label: "Project Expenses",
        component: () => import("../pages/expenses/project.js?v=" + BUILD_ID),
    },

    // Kategori Transaksi
    {
        path: "/transaction-categories",
        label: "Transaction Categories",
        component: () =>
            import("../pages/transaction-categories/index.js?v=" + BUILD_ID),
    },
    {
        path: "/transaction-categories/create",
        label: "Create Transaction Category",
        component: () =>
            import("../pages/transaction-categories/form.js?v=" + BUILD_ID),
    },
    {
        path: "/transaction-categories/:id/edit",
        label: "Edit Transaction Category",
        component: () =>
            import("../pages/transaction-categories/form.js?v=" + BUILD_ID),
    },

    // Metode Pembayaran
    {
        path: "/payment-methods",
        label: "Payment Methods",
        component: () =>
            import("../pages/payment-methods/index.js?v=" + BUILD_ID),
    },
    {
        path: "/payment-methods/create",
        label: "Create Payment Method",
        component: () =>
            import("../pages/payment-methods/form.js?v=" + BUILD_ID),
    },
    {
        path: "/payment-methods/:id/edit",
        label: "Edit Payment Method",
        component: () =>
            import("../pages/payment-methods/form.js?v=" + BUILD_ID),
    },

    // Rekening & Mutasi
    {
        path: "/accounts",
        label: "Accounts",
        component: () => import("../pages/accounts/index.js?v=" + BUILD_ID),
    },
    {
        path: "/accounts/create",
        label: "Create Account",
        component: () => import("../pages/accounts/form.js?v=" + BUILD_ID),
    },
    {
        path: "/accounts/:id/edit",
        label: "Edit Account",
        component: () => import("../pages/accounts/form.js?v=" + BUILD_ID),
    },
    {
        path: "/mutations",
        label: "Mutations",
        component: () => import("../pages/accounts/mutations.js?v=" + BUILD_ID),
    },
    {
        path: "/transfers",
        label: "Transfers",
        component: () => import("../pages/accounts/transfers.js?v=" + BUILD_ID),
    },

    // Laporan
    {
        path: "/reports/profit-loss",
        label: "Profit & Loss Report",
        component: () =>
            import("../pages/reports/profit-loss.js?v=" + BUILD_ID),
    },
    {
        path: "/reports/cashflow",
        label: "Cashflow Report",
        component: () => import("../pages/reports/cashflow.js?v=" + BUILD_ID),
    },
    {
        path: "/reports/incomes",
        label: "Income Report",
        component: () => import("../pages/reports/incomes.js?v=" + BUILD_ID),
    },
    {
        path: "/reports/expenses",
        label: "Expense Report",
        component: () => import("../pages/reports/expenses.js?v=" + BUILD_ID),
    },
    {
        path: "/reports/accounts",
        label: "Account Report",
        component: () => import("../pages/reports/accounts.js?v=" + BUILD_ID),
    },
    {
        path: "/reports/export",
        label: "Export Report",
        component: () => import("../pages/reports/export.js?v=" + BUILD_ID),
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
        path: "/roles",
        label: "Roles",
        component: () => import("../pages/roles/index.js?v=" + BUILD_ID),
    },
    {
        path: "/roles/create",
        label: "Create Role",
        component: () => import("../pages/roles/form.js?v=" + BUILD_ID),
    },
    {
        path: "/roles/:id/edit",
        label: "Edit Role",
        component: () => import("../pages/roles/form.js?v=" + BUILD_ID),
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
        path: "/login",
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
        path: "/my-profile/:id",
        label: "My Profile",
        component: () => import("../pages/kol/profile.js?v=" + BUILD_ID),
    },
];
