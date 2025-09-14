// /js/utils/auth-guard.js
export function installAuthInterceptor({
  loginPath   = '/admin/login', // login admin
  adminPrefix = '/admin',       // area admin
  sameOriginOnly = true,        // jangan tanggapi 401 dari cross-origin
} = {}) {
  const origFetch = window.fetch;

  function inAdminArea() {
    try { return location.pathname.startsWith(adminPrefix); }
    catch { return false; }
  }

  function isSameOriginRequest(input) {
    if (!sameOriginOnly) return true;
    try {
      const u = (typeof input === 'string')
        ? new URL(input, location.origin)
        : new URL(input.url, location.origin);
      return u.origin === location.origin;
    } catch {
      return true; // gagal parse → anggap same-origin supaya nggak terlalu kaku
    }
  }

  function shouldRedirectFor401(input) {
    // hanya saat kita ada di area admin & request (biasanya /api) dari origin yang sama
    if (!inAdminArea()) return false;
    if (!isSameOriginRequest(input)) return false;

    // hindari loop kalau sudah di halaman login
    if (location.pathname.startsWith(loginPath)) return false;

    // hindari loop saat call logout sendiri
    try {
      const url = (typeof input === 'string')
        ? new URL(input, location.origin)
        : new URL(input.url, location.origin);
      if (url.pathname === '/logout') return false;
    } catch (_) {}

    return true;
  }

  window.fetch = async (input, init = {}) => {
    let res;
    try {
      res = await origFetch(input, init);
    } catch (e) {
      // jaringan putus dsb → lempar lagi
      throw e;
    }

    if (res && res.status === 401 && shouldRedirectFor401(input)) {
      try {
        sessionStorage.setItem('FLASH_ERROR', 'Session kamu sudah kadaluarsa. Silahkan login ulang.');
        sessionStorage.setItem('AFTER_LOGIN_REDIRECT', location.pathname + location.search);
      } catch (_) {}

      location.replace(loginPath);
      // tetap kembalikan response supaya pemanggil nggak crash
    }

    return res;
  };
}
