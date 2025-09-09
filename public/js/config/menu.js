export const ownerMenu = [
    {
        label: "Dashboard",
        path: "/dashboard",
        icon: "bi-speedometer2",
    },
    {
        label: "Setup",
        icon: "bi-gear",
        children: [
            {
                label: "Brand",
                path: "/brands",
                icon: "bi-list-check",
            },
            {
                label: "Campaign",
                path: "/campaigns",
                icon: "bi-calendar2-week",
            },
            { label: "Kol", path: "/kol-list", icon: "bi-person-badge" },
        ],
    },
    
];
