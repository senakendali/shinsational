import { getCsrfToken, refreshCsrfToken } from '../utils/csrf.js';

const baseUrl = '/api/campaigns';

async function safeFetch(url, options, retryOnce = true) {
  const res = await fetch(url, options);
  if (res.status === 419 && retryOnce) {
    await refreshCsrfToken();
    const retryRes = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        'X-CSRF-TOKEN': getCsrfToken()
      }
    });
    return retryRes;
  }
  return res;
}

export const campaignService = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${baseUrl}${query ? '?' + query : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Gagal mengambil data campaign');
    return await res.json();
  },

  async get(id) {
    const res = await fetch(`${baseUrl}/${id}`);
    if (!res.ok) throw new Error('Gagal mengambil detail campaign');
    return await res.json();
  },

  async create(formData) {
    const res = await safeFetch(baseUrl, {
      method: 'POST',
      headers: {
        'X-CSRF-TOKEN': getCsrfToken(),
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw { message: error.message || 'Gagal membuat campaign', errors: error.errors || {} };
    }
    return await res.json();
  },

  async update(id, formData) {
    formData.set('_method', 'PUT'); // spoof ke route apiResource
    const res = await safeFetch(`${baseUrl}/${id}`, {
      method: 'POST',
      headers: {
        'X-CSRF-TOKEN': getCsrfToken(),
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw { message: error.message || 'Gagal mengupdate campaign', errors: error.errors || {} };
    }
    return await res.json();
  },

  async delete(id) {
    const res = await safeFetch(`${baseUrl}/${id}`, {
      method: 'DELETE',
      headers: { 'X-CSRF-TOKEN': getCsrfToken() }
    });
    if (!res.ok) throw new Error('Gagal menghapus campaign');
    return await res.json();
  }
};
