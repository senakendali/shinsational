import { ownerMenu } from '../config/menu.js';

export function renderNavbar(containerId = "navbar-menu", pathOverride = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const ul = document.createElement("ul");
  ul.className = "navbar-nav mx-auto";

  // ✅ Pastikan currentPath adalah string
  let currentPath = typeof pathOverride === 'string' ? pathOverride : window.location.pathname;
  currentPath = String(currentPath).replace(/\/$/, '');

  ownerMenu.forEach(item => {
    const li = document.createElement("li");
    li.className = "nav-item";

    if (item.children && item.children.length > 0) {
      li.classList.add("dropdown");

      const a = document.createElement("a");
      a.className = "nav-link dropdown-toggle d-flex align-items-center gap-2";
      a.href = "#";
      a.setAttribute("data-bs-toggle", "dropdown");
      a.innerHTML = `<i class="bi ${item.icon}"></i> ${item.label}`;

      const dropdown = document.createElement("ul");
      dropdown.className = "dropdown-menu dropdown-menu-end";

      item.children.forEach(child => {
        const childLi = document.createElement("li");
        const childA = document.createElement("a");
        childA.className = "dropdown-item app-link d-flex align-items-center gap-2";
        childA.href = child.path;
        childA.innerHTML = `<i class="bi ${child.icon}"></i> ${child.label}`;

        if (currentPath === child.path) {
          a.classList.add("active");
          childA.classList.add("active");
        }

        childLi.appendChild(childA);
        dropdown.appendChild(childLi);
      });

      li.appendChild(a);
      li.appendChild(dropdown);
    } else {
      const a = document.createElement("a");
      a.className = "nav-link app-link d-flex align-items-center gap-2";
      a.href = item.path;
      a.innerHTML = `<i class="bi ${item.icon}"></i> ${item.label}`;

      if (currentPath === item.path) {
        a.classList.add("active");
      }

      li.appendChild(a);
    }

    ul.appendChild(li);
  });

  const logoutLi = document.createElement("li");
  logoutLi.className = "nav-item";
  logoutLi.innerHTML = `
    <a class="nav-link text-danger d-flex align-items-center gap-2" href="#">
      <i class="bi bi-box-arrow-right"></i> Logout
    </a>
  `;
  ul.appendChild(logoutLi);

  container.innerHTML = "";
  container.appendChild(ul);
}
