// /js/services/meService.js
const BASE = '/api/me';
const isFormData = (v) => typeof FormData !== 'undefined' && v instanceof FormData;

const v = (typeof window !== 'undefined' && (window.BUILD_VERSION || Date.now())) || Date.now();

let _csrfMod;
async function csrf() {
  if (_csrfMod) return _csrfMod;
  _csrfMod = await import(`../utils/csrf.js?v=${v}`);
  return _csrfMod;
}

async function safeFetch(url, options, retryOnce = true) {
  const res = await fetch(url, options);
  if (res.status === 419 && retryOnce) {
    const { refreshCsrfToken, getCsrfToken } = await csrf();
    await refreshCsrfToken();
    const retryRes = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        'X-CSRF-TOKEN': getCsrfToken(),
      },
    });
    return retryRes;
  }
  return res;
}

async function handleResponse(res, defaultMsg = 'Request gagal') {
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json')
    ? await res.json().catch(() => ({}))
    : await res.text();

  if (!res.ok) {
    throw {
      status: res.status,
      message: (data && data.message) || `${defaultMsg} (${res.status})`,
      errors: data && data.errors ? data.errors : {},
    };
  }
  return data;
}

export const meService = {
  async get() {
    const res = await fetch(BASE, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    return handleResponse(res, 'Gagal mengambil profil');
  },

  // name, email (FormData or JSON)
  async updateProfile(payload = {}) {
    const url = `${BASE}`;
    const { getCsrfToken } = await csrf();
    const usingFormData = isFormData(payload);
    let body, headers, method;

    if (usingFormData) {
      payload.set('_method', 'PATCH');
      method = 'POST';
      body = payload;
      headers = {
        'X-CSRF-TOKEN': getCsrfToken(),
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };
    } else {
      method = 'POST';
      body = JSON.stringify({ ...(payload || {}), _method: 'PATCH' });
      headers = {
        'X-CSRF-TOKEN': getCsrfToken(),
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
      };
    }

    const res = await safeFetch(url, { method, headers, body, credentials: 'same-origin' });
    return handleResponse(res, 'Gagal memperbarui profil');
  },

  // current_password, password, password_confirmation (FormData or JSON)
  async updatePassword(payload = {}) {
    const url = `${BASE}/password`;
    const { getCsrfToken } = await csrf();
    const usingFormData = isFormData(payload);
    let body, headers, method;

    if (usingFormData) {
      payload.set('_method', 'PATCH');
      method = 'POST';
      body = payload;
      headers = {
        'X-CSRF-TOKEN': getCsrfToken(),
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };
    } else {
      method = 'POST';
      body = JSON.stringify({ ...(payload || {}), _method: 'PATCH' });
      headers = {
        'X-CSRF-TOKEN': getCsrfToken(),
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
      };
    }

    const res = await safeFetch(url, { method, headers, body, credentials: 'same-origin' });
    return handleResponse(res, 'Gagal mengganti password');
  },

  // FormData { avatar: File }
  async updateAvatar(formData) {
    const url = `${BASE}/avatar`;
    if (!(formData instanceof FormData)) {
      const fd = new FormData();
      if (formData?.avatar) fd.set('avatar', formData.avatar);
      formData = fd;
    }
    const { getCsrfToken } = await csrf();
    const res = await safeFetch(url, {
      method: 'POST',
      headers: {
        'X-CSRF-TOKEN': getCsrfToken(),
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: formData,
      credentials: 'same-origin',
    });
    return handleResponse(res, 'Gagal mengunggah foto profil');
  },
};
