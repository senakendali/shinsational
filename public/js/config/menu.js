export const ownerMenu = [
    {
        label: "Dashboard",
        path: "/dashboard",
        icon: "bi-speedometer2",
    },
    {
        label: "Proyek",
        icon: "bi-briefcase",
        children: [
            {
                label: "Daftar Proyek",
                path: "/projects",
                icon: "bi-list-check",
            },
            {
                label: "Termin Pembayaran",
                path: "/project-terms",
                icon: "bi-calendar2-week",
            },
            { label: "Klien", path: "/clients", icon: "bi-person-badge" },
        ],
    },
    {
      label: "Transaksi Keuangan",
      icon: "bi-cash-stack",
      children: [
          // Pemasukan
          {
              label: "Pemasukan",
              path: "/incomes",
              icon: "bi-arrow-down-circle",
          },

          // Pengeluaran
          {
              label: "Pengeluaran",
              path: "/expenses",
              icon: "bi-arrow-up-circle",
          },
          

          // Master
          {
              label: "Kategori Transaksi",
              path: "/transaction-categories",
              icon: "bi-folder2",
          },
          {
              label: "Metode Pembayaran",
              path: "/payment-methods",
              icon: "bi-folder2",
          },
      ],
  },
    {
        label: "Kas & Rekening",
        icon: "bi-wallet2",
        children: [
            { label: "Rekening & Saldo", path: "/accounts", icon: "bi-bank" },
            {
                label: "Mutasi Kas",
                path: "/mutations",
                icon: "bi-arrow-left-right",
            },
            {
                label: "Transfer Antar Rekening",
                path: "/transfers",
                icon: "bi-send",
            },
        ],
    },
    {
        label: "Laporan Keuangan",
        icon: "bi-file-earmark-bar-graph",
        children: [
            {
                label: "Laba Rugi",
                path: "/reports/profit-loss",
                icon: "bi-graph-up",
            },
            {
                label: "Arus Kas",
                path: "/reports/cashflow",
                icon: "bi-graph-down",
            },
            {
                label: "Laporan Pemasukan",
                path: "/reports/incomes",
                icon: "bi-arrow-down-circle",
            },
            {
                label: "Laporan Pengeluaran",
                path: "/reports/expenses",
                icon: "bi-arrow-up-circle",
            },
            {
                label: "Laporan Rekening",
                path: "/reports/accounts",
                icon: "bi-bank2",
            },
            {
                label: "Ekspor Laporan",
                path: "/reports/export",
                icon: "bi-download",
            },
        ],
    },
    {
        label: "Pengaturan",
        icon: "bi-gear",
        children: [
            { label: "Manajemen Pengguna", path: "/users", icon: "bi-people" },
            {
                label: "Hak Akses & Role",
                path: "/roles",
                icon: "bi-shield-lock",
            },
            {
                label: "Pengaturan Sistem",
                path: "/settings",
                icon: "bi-sliders",
            },
        ],
    },
];
