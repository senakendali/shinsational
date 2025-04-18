// Buat input form standar
export function formGroup(name, label, type = 'text', placeholder = '', extra = '') {
    return `
      <div class="mb-3">
        <label for="${name}" class="form-label">${label}</label>
        <input type="${type}" class="form-control" id="${name}" name="${name}" 
          ${placeholder ? `placeholder="${placeholder}"` : ''} ${extra} />
        <div class="invalid-feedback d-block" id="error-${name}"></div>
      </div>
    `;
  }
  
  // Buat textarea
  export function formTextarea(name, label, rows = 3) {
    return `
      <div class="mb-3">
        <label for="${name}" class="form-label">${label}</label>
        <textarea class="form-control" id="${name}" name="${name}" rows="${rows}"></textarea>
        <div class="invalid-feedback d-block" id="error-${name}"></div>
      </div>
    `;
  }
  
  // Buat select box
  export function formSelect(name, label, options = []) {
    return `
      <div class="mb-3">
        <label for="${name}" class="form-label">${label}</label>
        <select class="form-select" id="${name}" name="${name}">
          ${options.map(o => `<option value="${o}">${o.charAt(0).toUpperCase() + o.slice(1)}</option>`).join('')}
        </select>
        <div class="invalid-feedback d-block" id="error-${name}"></div>
      </div>
    `;
  }
  
  // Tampilkan error per input
  export function showValidationErrors(errors) {
    for (let field in errors) {
      const message = errors[field][0];
      const errorEl = document.getElementById(`error-${field}`);
      if (errorEl) errorEl.textContent = message;
    }
  }
  
  // Clear semua error form
  export function clearAllErrors() {
    document.querySelectorAll('[id^="error-"]').forEach(el => el.textContent = '');
  }
  