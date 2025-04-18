export function showToast(message, type = 'success') {
    const existing = document.getElementById('global-toast');
    if (existing) existing.remove();
  
    const toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = `toast-container toast-${type}`;
    toast.innerHTML = `
      <div class="toast-body">
        <span>${message}</span>
        <div class="toast-timer"></div>
      </div>
    `;
  
    document.body.appendChild(toast);
  
    setTimeout(() => {
      toast.classList.add('show');
      // Start timer bar animation
      toast.querySelector('.toast-timer').style.width = '0%';
    }, 10);
  
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }