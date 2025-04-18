export function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}

export async function refreshCsrfToken() {
    try {
        const res = await fetch('/refresh-csrf');
        if (res.ok) {
        const data = await res.json();
        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) {
            meta.setAttribute('content', data.token);
            console.log('CSRF token diperbarui!');
            return data.token;
        }
        }
        throw new Error('Gagal refresh CSRF token');
    } catch (err) {
        console.error(err);
        return null;
    }
}
  