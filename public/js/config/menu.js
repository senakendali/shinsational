// /js/config/menu.js
export const ownerMenu = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: "bi-speedometer2",
    // brand punya "dashboard.view", admin punya "dashboard.viewAny"
    can: ["dashboard.view", "dashboard.viewAny"],
  },

  {
    label: "Setup",
    icon: "bi-gear",
    can: ["brand.viewAny", "campaign.viewAny"],
    children: [
      { label: "Brand",    path: "/admin/brands",    icon: "bi-list-check",     can: "brand.viewAny" },
      { label: "Campaign", path: "/admin/campaigns", icon: "bi-calendar2-week", can: "campaign.viewAny" },
    ],
  },

  {
    label: "Data",
    icon: "bi-file-earmark-bar-graph",
    can: ["submission.viewAny"],
    children: [
      { label: "KOL", path: "/admin/kol", icon: "bi-list-check", can: "submission.viewAny" },
      { label: "Content Approval", path: "/admin/drafts", icon: "bi-list-check", can: "submission.viewAny" },
      { label: "Submission", path: "/admin/submissions", icon: "bi-list-check", can: "submission.viewAny" },
    ],
  },

  {
    label: "System",
    icon: "bi-gear",
    can: ["role.viewAny", "user.viewAny", "permission.viewAny"],
    children: [
      { label: "Roles",        path: "/admin/roles",        icon: "bi-list-check",   can: "role.viewAny" },
      { label: "Users",        path: "/admin/users",        icon: "bi-people",       can: "user.viewAny" },
      { label: "Permissions",  path: "/admin/permissions",  icon: "bi-shield-lock",  can: "permission.viewAny" },
    ],
  },
];

export default ownerMenu;
