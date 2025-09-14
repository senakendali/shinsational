// /js/services/permissionService.js
const BASE = '/api/permissions';
const isFormData = (v) => typeof FormData !== 'undefined' && v instanceof FormData;

// 🔥 versi untuk cache-busting
const v = (typeof window !== 'undefined' && (window.BUILD_VERSION || Date.now())) || Date.now();

// 🔁 lazy dynamic import utk csrf utils
let _csrfMod;
async function csrf() {
  if (_csrfMod) return _csrfMod;
  _csrfMod = await import(`../utils/csrf.js?v=${v}`);  // <— dinamis
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

function qs(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k + '[]', x));
    else sp.set(k, String(v));
  });
  return sp.toString();
}

export const permissionService = {
  async getAll(params = {}) {
    const url = `${BASE}${Object.keys(params).length ? `?${qs(params)}` : ''}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    return handleResponse(res, 'Gagal mengambil data permission');
  },

  async get(id, params = {}) {
    const url = `${BASE}/${encodeURIComponent(id)}${Object.keys(params).length ? `?${qs(params)}` : ''}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    return handleResponse(res, 'Gagal mengambil detail permission');
  },

  async create(payload = {}) {
    const usingFormData = isFormData(payload);
    const { getCsrfToken } = await csrf();

    const res = await safeFetch(BASE, {
      method: 'POST',
      headers: {
        'X-CSRF-TOKEN': getCsrfToken(),
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(usingFormData ? {} : { 'Content-Type': 'application/json' }),
      },
      body: usingFormData ? payload : JSON.stringify(payload),
    });

    return handleResponse(res, 'Gagal membuat permission');
  },

  async update(id, payload = {}) {
    const url = `${BASE}/${encodeURIComponent(id)}`;
    const { getCsrfToken } = await csrf();

    if (isFormData(payload)) {
      payload.set('_method', 'PUT'); // spoof PUT
      const res = await safeFetch(url, {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': getCsrfToken(),
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: payload,
      });
      return handleResponse(res, 'Gagal mengupdate permission');
    } else {
      const body = { ...payload, _method: 'PUT' };
      const res = await safeFetch(url, {
        method: 'PATCH',
        headers: {
          'X-CSRF-TOKEN': getCsrfToken(),
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      return handleResponse(res, 'Gagal mengupdate permission');
    }
  },

  async delete(id) {
    const { getCsrfToken } = await csrf();
    const res = await safeFetch(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'X-CSRF-TOKEN': getCsrfToken(),
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    return handleResponse(res, 'Gagal menghapus permission');
  },
};
