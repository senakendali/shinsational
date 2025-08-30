export const routes = [
    // Dashboard
    {
        path: "/dashboard",
        label: "Dashboard",
        component: () => import("../pages/dashboard.js"),
    },

    // Proyek
    {
        path: "/projects",
        label: "Projects",
        component: () => import("../pages/projects/index.js"),
    },
    {
        path: "/projects/create",
        label: "Create Project",
        component: () => import("../pages/projects/form.js"),
    },
    {
        path: "/projects/:id/edit",
        label: "Edit Project",
        component: () => import("../pages/projects/form.js"),
    },
    {
        path: "/project-terms",
        label: "Project Terms",
        component: () => import("../pages/project-terms/index.js"),
    },
    {
        path: "/project-terms/create",
        label: "Create Project Term",
        component: () => import("../pages/project-terms/form.js"),
    },
    {
        path: "/project-terms/:id/edit",
        label: "Edit Project Term",
        component: () => import("../pages/project-terms/form.js"),
    },
    {
        path: "/project-terms/:id/invoice",
        label: "Invoice",
        component: () => import("../pages/project-terms/invoice.js"),
    },

    // Klien
    {
        path: "/clients",
        label: "Clients",
        component: () => import("../pages/clients/index.js"),
    },
    {
        path: "/clients/create",
        label: "Create Client",
        component: () => import("../pages/clients/form.js"),
    },
    {
        path: "/clients/:id/edit",
        label: "Edit Client",
        component: () => import("../pages/clients/form.js"),
    },

    // Pemasukan
    {
        path: "/incomes",
        label: "Incomes",
        component: () => import("../pages/incomes/index.js"),
    },
    {
        path: "/incomes/create",
        label: "Create Income",
        component: () => import("../pages/incomes/form.js"),
    },
    {
        path: "/incomes/:id/edit",
        label: "Edit Income",
        component: () => import("../pages/incomes/form.js"),
    },
    {
        path: "/incomes/projects",
        label: "Project Incomes",
        component: () => import("../pages/incomes/projects.js"),
    },
    {
        path: "/incomes/others",
        label: "Other Incomes",
        component: () => import("../pages/incomes/others.js"),
    },

    // Pengeluaran
    {
        path: "/expenses",
        label: "Expenses",
        component: () => import("../pages/expenses/index.js"),
    },
    {
        path: "/expenses/create",
        label: "Create Expense",
        component: () => import("../pages/expenses/form.js"),
    },
    {
        path: "/expenses/:id/edit",
        label: "Edit Expense",
        component: () => import("../pages/expenses/form.js"),
    },
    {
        path: "/expenses/operational",
        label: "Operational Expenses",
        component: () => import("../pages/expenses/operational.js"),
    },
    {
        path: "/expenses/payroll",
        label: "Payroll Expenses",
        component: () => import("../pages/expenses/payroll.js"),
    },
    {
        path: "/expenses/project",
        label: "Project Expenses",
        component: () => import("../pages/expenses/project.js"),
    },

    // Kategori Transaksi
    {
        path: "/transaction-categories",
        label: "Transaction Categories",
        component: () => import("../pages/transaction-categories/index.js"),
    },
    {
        path: "/transaction-categories/create",
        label: "Create Transaction Category",
        component: () => import("../pages/transaction-categories/form.js"),
    },
    {
        path: "/transaction-categories/:id/edit",
        label: "Edit Transaction Category",
        component: () => import("../pages/transaction-categories/form.js"),
    },

    // Metode Pembayaran
    {
        path: "/payment-methods",
        label: "Payment Methods",
        component: () => import("../pages/payment-methods/index.js"),
    },
    {
        path: "/payment-methods/create",
        label: "Create Payment Method",
        component: () => import("../pages/payment-methods/form.js"),
    },
    {
        path: "/payment-methods/:id/edit",
        label: "Edit Payment Method",
        component: () => import("../pages/payment-methods/form.js"),
    },

    // Rekening & Mutasi
    {
        path: "/accounts",
        label: "Accounts",
        component: () => import("../pages/accounts/index.js"),
    },
    {
        path: "/accounts/create",
        label: "Create Account",
        component: () => import("../pages/accounts/form.js"),
    },
    {
        path: "/accounts/:id/edit",
        label: "Edit Account",
        component: () => import("../pages/accounts/form.js"),
    },
    {
        path: "/mutations",
        label: "Mutations",
        component: () => import("../pages/accounts/mutations.js"),
    },
    {
        path: "/transfers",
        label: "Transfers",
        component: () => import("../pages/accounts/transfers.js"),
    },

    // Laporan
    {
        path: "/reports/profit-loss",
        label: "Profit & Loss Report",
        component: () => import("../pages/reports/profit-loss.js"),
    },
    {
        path: "/reports/cashflow",
        label: "Cashflow Report",
        component: () => import("../pages/reports/cashflow.js"),
    },
    {
        path: "/reports/incomes",
        label: "Income Report",
        component: () => import("../pages/reports/incomes.js"),
    },
    {
        path: "/reports/expenses",
        label: "Expense Report",
        component: () => import("../pages/reports/expenses.js"),
    },
    {
        path: "/reports/accounts",
        label: "Account Report",
        component: () => import("../pages/reports/accounts.js"),
    },
    {
        path: "/reports/export",
        label: "Export Report",
        component: () => import("../pages/reports/export.js"),
    },

    // Pengguna
    {
        path: "/users",
        label: "Users",
        component: () => import("../pages/users/index.js"),
    },
    {
        path: "/users/create",
        label: "Create User",
        component: () => import("../pages/users/form.js"),
    },
    {
        path: "/users/:id/edit",
        label: "Edit User",
        component: () => import("../pages/users/form.js"),
    },

    // Role
    {
        path: "/roles",
        label: "Roles",
        component: () => import("../pages/roles/index.js"),
    },
    {
        path: "/roles/create",
        label: "Create Role",
        component: () => import("../pages/roles/form.js"),
    },
    {
        path: "/roles/:id/edit",
        label: "Edit Role",
        component: () => import("../pages/roles/form.js"),
    },

    // Pengaturan Sistem
    {
        path: "/settings",
        label: "Settings",
        component: () => import("../pages/settings/index.js"),
    },

    // Fallback 404
    {
        path: "*",
        component: () => import("../pages/not-found.js"),
    },

    // Login
    {
        path: "/login",
        label: "Login",
        component: () => import("../pages/auth/login.js"),
    },

    // Profile
    {
        path: "/my-profile",
        label: "My Profile",
        component: () => import("../pages/profile/index.js"),
    },

    // Kol
    {
        path: "/kol",
        label: "KOL",
        component: () => import("../pages/kol/index.js"),
    },
    {
        path: "/kol/registration",
        label: "KOL Registration",
        component: () => import("../pages/kol/registration.js"),
    },
];
