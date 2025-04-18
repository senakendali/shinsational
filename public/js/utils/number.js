// Format jadi 1.000.000
export function formatNumber(value) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Hilangkan titik, koma, dan Rp
export function unformatNumber(value) {
    return value.replace(/[^\d]/g, '');
}
  