export function showLoader() {
    let loader = document.getElementById("top-loader");
    if (!loader) {
        loader = document.createElement("div");
        loader.id = "top-loader";
        loader.style.position = "fixed";
        loader.style.top = "0";
        loader.style.left = "0";
        loader.style.width = "0%";
        loader.style.height = "10px";
        loader.style.zIndex = "9999";
        loader.style.transition = "width 0.4s ease-out";
        loader.style.background = "linear-gradient(to right, orange 30%, transparent 50%, orange 70%)";
        loader.style.backgroundSize = "200% 100%";
        loader.style.animation = "gradientShift 1s linear infinite";
        document.body.appendChild(loader);

        if (!document.getElementById("loader-style")) {
            const style = document.createElement("style");
            style.id = "loader-style";
            style.textContent = `
                @keyframes gradientShift {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 100% 50%; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    loader.style.width = "0%";
    setTimeout(() => loader.style.width = "100%", 10);
}

export function hideLoader() {
    const loader = document.getElementById("top-loader");
    if (loader) {
        loader.style.width = "100%";
        setTimeout(() => loader.remove(), 400);
    }
}
