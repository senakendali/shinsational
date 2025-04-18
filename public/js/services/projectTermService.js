import { getCsrfToken, refreshCsrfToken } from '../utils/csrf.js';

const baseUrl = '/api/project-terms';

async function safeFetch(url, options, retryOnce = true) {
  const res = await fetch(url, options);
  if (res.status === 419 && retryOnce) {
    await refreshCsrfToken();
    const retryRes = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'X-CSRF-TOKEN': getCsrfToken()
      }
    });
    return retryRes;
  }
  return res;
}

export const projectTermService = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${baseUrl}${query ? '?' + query : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Gagal mengambil data termin');
    return await res.json();
  },

  async get(id) {
    const res = await fetch(`${baseUrl}/${id}`);
    if (!res.ok) throw new Error('Gagal mengambil detail termin');
    return await res.json();
  },

  async create(formData) {
    const res = await safeFetch(baseUrl, {
      method: 'POST',
      headers: {
        'X-CSRF-TOKEN': getCsrfToken()
      },
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json();
      throw { message: error.message || 'Gagal membuat termin', errors: error.errors || {} };
    }

    return await res.json();
  },

  async update(id, formData) {
    const res = await safeFetch(`${baseUrl}/${id}`, {
      method: 'POST',
      headers: {
        'X-CSRF-TOKEN': getCsrfToken()
      },
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json();
      throw { message: error.message || 'Gagal mengupdate termin', errors: error.errors || {} };
    }

    return await res.json();
  },

  async delete(id) {
    const res = await safeFetch(`${baseUrl}/${id}`, {
      method: 'DELETE',
      headers: {
        'X-CSRF-TOKEN': getCsrfToken()
      }
    });

    if (!res.ok) throw new Error('Gagal menghapus termin');
    return await res.json();
  }
};
