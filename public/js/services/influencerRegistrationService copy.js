// services/influencerRegistrationService.js
import { getCsrfToken, refreshCsrfToken } from '../utils/csrf.js';

const baseUrl = '/api/influencer-registrations';

async function safeFetch(url, options, retryOnce = true) {
  const res = await fetch(url, options);
  if (res.status === 419 && retryOnce) {
    await refreshCsrfToken();
    const retryRes = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        'X-CSRF-TOKEN': getCsrfToken(),
      }
    });
    return retryRes;
  }
  return res;
}

export const influencerService = {
  async create(formData) {
    // NOTE: pakai FormData biar gampang (sama seperti clientService)
    const res = await safeFetch(baseUrl, {
      method: 'POST',
      headers: {
        'X-CSRF-TOKEN': getCsrfToken(),
        'Accept': 'application/json', // pastikan backend balikin JSON utk 422
      },
      body: formData,
      credentials: 'same-origin',
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Struktur error Laravel: { message, errors: { field: ["msg", ...] } }
      throw {
        status: res.status,
        message: data.message || 'Gagal menyimpan registrasi',
        errors: data.errors || {},
      };
    }

    return data;
  },

  // (opsional) kalau butuh GET detail/daftar
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${baseUrl}${query ? '?' + query : ''}`;
    const res = await fetch(url, { headers: { 'Accept':'application/json' }});
    if (!res.ok) throw new Error('Gagal mengambil data registrasi');
    return await res.json();
  },

  async get(id) {
    const res = await fetch(`${baseUrl}/${id}`, { headers: { 'Accept':'application/json' }});
    if (!res.ok) throw new Error('Gagal mengambil detail registrasi');
    return await res.json();
  },
};
