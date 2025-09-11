export const ownerMenu = [
    {
        label: "Dashboard",
        path: "/admin/dashboard",
        icon: "bi-speedometer2",
    },
    {
        label: "Setup",
        icon: "bi-gear",
        children: [
            {
                label: "Brand",
                path: "/admin/brands",
                icon: "bi-list-check",
            },
            {
                label: "Campaign",
                path: "/admin/campaigns",
                icon: "bi-calendar2-week",
            },
            
        ],
    },
    {
        label: "Data",
        icon: "bi-file-earmark-bar-graph",
        children: [
            { 
                label: "Submission", 
                path: "/admin/submissions", 
                icon: "bi-list-check" 
            },
        ],
    },
    
];
