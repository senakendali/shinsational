// /public/js/services/influencerSubmissionService.js
import { getCsrfToken, refreshCsrfToken } from '../utils/csrf.js';

const baseUrl = '/api/influencer-submissions';

async function safeFetch(url, options, retryOnce = true) {
  const res = await fetch(url, options);
  if (res.status === 419 && retryOnce) {
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

export const submissionService = {
  /**
   * Create submission (multipart/form-data)
   * Expected fields in FormData:
   * - tiktok_user_id (string, required)
   * - campaign_id (number, required)
   * - link_1, link_2 (string, required)
   * - screenshot_1, screenshot_2 (File, optional)
   * - purchase_platform (string: 'tiktokshop'|'shopee', optional)
   * - invoice_file, review_proof_file (File, optional)
   */
  async create(formData) {
    const res = await safeFetch(baseUrl, {
      method: 'POST',
      headers: {
        'X-CSRF-TOKEN': getCsrfToken(),
        'Accept': 'application/json',
      },
      body: formData,
      credentials: 'same-origin',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw {
        status: res.status,
        message: data.message || 'Gagal mengirim submission',
        errors: data.errors || {},
      };
    }
    return data;
  },

  async getAll(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${baseUrl}${qs ? `?${qs}` : ''}`, {
      headers: { 'Accept': 'application/json' },
      credentials: 'same-origin',
    });
    if (!res.ok) throw new Error('Gagal mengambil data submissions');
    return res.json();
  },

  async get(id) {
    const res = await fetch(`${baseUrl}/${id}`, {
      headers: { 'Accept': 'application/json' },
      credentials: 'same-origin',
    });
    if (!res.ok) throw new Error('Gagal mengambil detail submission');
    return res.json();
  },

  async update(id, formData) {
    // Gunakan method spoofing agar aman di banyak setup server
    formData.set('_method', 'PUT');
    const res = await safeFetch(`${baseUrl}/${id}`, {
      method: 'POST',
      headers: {
        'X-CSRF-TOKEN': getCsrfToken(),
        'Accept': 'application/json',
      },
      body: formData,
      credentials: 'same-origin',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw {
        status: res.status,
        message: data.message || 'Gagal mengubah submission',
        errors: data.errors || {},
      };
    }
    return data;
  },

  async delete(id) {
    const res = await safeFetch(`${baseUrl}/${id}`, {
      method: 'DELETE',
      headers: {
        'X-CSRF-TOKEN': getCsrfToken(),
        'Accept': 'application/json',
      },
      credentials: 'same-origin',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw {
        status: res.status,
        message: data.message || 'Gagal menghapus submission',
      };
    }
    return data;
  },
};
