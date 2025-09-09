// /public/js/services/authService.js
import { getCsrfToken, refreshCsrfToken } from '../utils/csrf.js';

const loginUrl  = '/login';   // ganti kalau pakai endpoint lain
const logoutUrl = '/logout';

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

export const authService = {
  async login(formData) {
    const res = await safeFetch(loginUrl, {
      method: 'POST',
      headers: {
        'X-CSRF-TOKEN': getCsrfToken(),
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: formData,
      credentials: 'same-origin',
    });

    if (!res.ok) {
      let error = {};
      try { error = await res.json(); } catch {}
      throw {
        message: error.message || 'Gagal login.',
        errors : error.errors || {},
        status : res.status
      };
    }

    try { return await res.json(); } catch { return { ok: true }; }
  },

  async logout() {
    const res = await safeFetch(logoutUrl, {
      method: 'POST',
      headers: {
        'X-CSRF-TOKEN': getCsrfToken(),
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
    });

    if (!res.ok) {
      let error = {};
      try { error = await res.json(); } catch {}
      throw {
        message: error.message || 'Gagal logout.',
        status : res.status
      };
    }

    return await res.json().catch(() => ({ ok: true }));
  },
};
