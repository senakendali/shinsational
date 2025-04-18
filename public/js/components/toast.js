export function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0 show`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = \`
        <div class="d-flex">
            <div class="toast-body">\${message}</div>
        </div>
    \`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
