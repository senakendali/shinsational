// /js/services/influencerRegistrationService.js
import { getCsrfToken, refreshCsrfToken } from '../utils/csrf.js';

const baseUrl = '/api/influencer-registrations';

function toQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    qs.set(k, v);
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

async function safeFetch(url, options = {}, retryOnce = true) {
  const res = await fetch(url, { credentials: 'same-origin', ...options });
  if (res.status === 419 && retryOnce) {
    await refreshCsrfToken();
    const res2 = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: {
        ...(options.headers || {}),
        'X-CSRF-TOKEN': getCsrfToken(),
      },
    });
    return res2;
  }
  return res;
}

function buildError(res, fallbackMsg = 'Terjadi kesalahan') {
  return res.json()
    .catch(() => ({}))
    .then((data) => {
      const err = new Error(data.message || fallbackMsg);
      err.status = res.status;
      if (data.errors) err.errors = data.errors; // Laravel 422 shape
      return Promise.reject(err);
    });
}

export const influencerService = {
  // CREATE (FormData)
  async create(formData) {
    const res = await safeFetch(baseUrl, {
      method: 'POST',
      headers: {
        'X-CSRF-TOKEN': getCsrfToken(),
        'Accept': 'application/json',
      },
      body: formData,
    });

    if (!res.ok) {
      return buildError(res, 'Gagal menyimpan registrasi');
    }
    return res.json();
  },

  // INDEX / LIST
  async getAll(params = {}) {
    const url = `${baseUrl}${toQuery(params)}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      credentials: 'same-origin',
    });
    if (!res.ok) throw new Error('Gagal mengambil data registrasi');
    return res.json();
  },

  // SHOW (detail)
  async get(id, params = {}) {
    const url = `${baseUrl}/${id}${toQuery(params)}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      credentials: 'same-origin',
    });
    if (!res.ok) throw new Error('Gagal mengambil detail registrasi');
    return res.json();
  },

  // UPDATE (JSON body, semua field opsional sesuai controller->update)
  async update(id, payload = {}) {
    const res = await safeFetch(`${baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'X-CSRF-TOKEN': getCsrfToken(),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return buildError(res, 'Gagal memperbarui registrasi');
    }
    return res.json();
  },

  // DELETE
  async delete(id) {
    const res = await safeFetch(`${baseUrl}/${id}`, {
      method: 'DELETE',
      headers: {
        'X-CSRF-TOKEN': getCsrfToken(),
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return buildError(res, 'Gagal menghapus registrasi');
    }
    return res.json();
  },

  // CHECK (resolve id dari tiktok_user_id + optional campaign_id/slug)
  async check({ tiktok_user_id, campaign_id, campaign } = {}) {
    const params = { tiktok_user_id, campaign_id, campaign };
    const url = `${baseUrl}/check${toQuery(params)}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      credentials: 'same-origin',
    });
    if (!res.ok) throw new Error('Gagal mengecek registrasi');
    return res.json(); // { exists, data, campaign_id }
  },

  // (opsional) daftar campaign yang pernah diikuti oleh open_id tertentu
  async campaignsByTiktok(tiktok_user_id, params = {}) {
    const url = `/api/influencers/${encodeURIComponent(tiktok_user_id)}/campaigns${toQuery(params)}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      credentials: 'same-origin',
    });
    if (!res.ok) throw new Error('Gagal mengambil campaign KOL');
    return res.json();
  },

  // (opsional) campaign milik session /me
  async myCampaigns(params = {}) {
    const url = `/api/me/campaigns${toQuery(params)}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      credentials: 'same-origin',
    });
    if (!res.ok) throw new Error('Gagal mengambil campaign saya');
    return res.json();
  },
};
