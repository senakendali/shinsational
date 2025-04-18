import { renderBreadcrumb } from '../components/breadcrumb.js';

export function render(target, path, query = {}, labelOverride = null) {
    target.innerHTML = "";
    renderBreadcrumb(target, path, labelOverride);

    // Konten utama dashboard keuangan
    target.innerHTML += `
        <!-- Ringkasan Keuangan -->
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card text-white bg-success mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Total Saldo</h5>
                        <p class="card-text fs-3">Rp 52.300.000</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-white bg-primary mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Pendapatan Bulan Ini</h5>
                        <p class="card-text fs-3">Rp 18.500.000</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-white bg-danger mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Pengeluaran Bulan Ini</h5>
                        <p class="card-text fs-3">Rp 7.200.000</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-white bg-warning mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Laba / Rugi</h5>
                        <p class="card-text fs-3">Rp 11.300.000</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Grafik Arus Kas -->
        <div class="mb-5">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="mb-0">Grafik Arus Kas per Bulan</h5>
                <select id="yearFilter" class="form-select w-auto">
                    <option value="2025" selected>2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                </select>
            </div>
            <canvas id="cashflowChart" height="120"></canvas>
        </div>

        <!-- Proyek Aktif -->
        <div class="mb-5">
            <h5 class="mb-3">Proyek Aktif Saat Ini</h5>
            <ul class="list-group">
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    Website BUMN <span class="badge bg-success">Berjalan</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    Sistem E-Voting Pemilu <span class="badge bg-success">Berjalan</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    Aplikasi Kepegawaian <span class="badge bg-warning">Pending</span>
                </li>
            </ul>
        </div>

        <!-- Pengeluaran Terbesar -->
        <div class="mb-5">
            <h5 class="mb-3">Top 3 Pengeluaran Bulan Ini</h5>
            <ol class="list-group list-group-numbered">
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    Gaji Tim Dev
                    <span class="badge bg-danger rounded-pill">Rp 5.000.000</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    Hosting & Cloud Server
                    <span class="badge bg-danger rounded-pill">Rp 1.500.000</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    Internet Kantor
                    <span class="badge bg-danger rounded-pill">Rp 700.000</span>
                </li>
            </ol>
        </div>

        <!-- Aktivitas Keuangan Terbaru -->
        <div class="mb-5">
            <h5 class="mb-3">Aktivitas Keuangan Terbaru</h5>
            <ul class="list-group">
                <li class="list-group-item">20 Apr 2025 - Terima pembayaran proyek "Sistem Pemilu" Rp 12.000.000</li>
                <li class="list-group-item">19 Apr 2025 - Bayar gaji freelancer backend Rp 2.500.000</li>
                <li class="list-group-item">18 Apr 2025 - Pembayaran hosting AWS Rp 1.000.000</li>
            </ul>
        </div>
    `;

    setupCashflowChart();
}

function setupCashflowChart() {
    const ctx = document.getElementById('cashflowChart').getContext('2d');
    const yearSelect = document.getElementById('yearFilter');

    const dataPerYear = {
        2025: {
            pemasukan: [5000000, 7000000, 8000000, 12000000, 10000000, 15000000, 13000000, 14000000, 17000000, 16000000, 18000000, 20000000],
            pengeluaran: [2000000, 3000000, 4000000, 5000000, 6000000, 7000000, 4000000, 5000000, 6000000, 7000000, 6500000, 7200000]
        },
        2024: {
            pemasukan: [3000000, 5000000, 7000000, 10000000, 8000000, 9000000, 8500000, 9500000, 11000000, 10000000, 12000000, 13000000],
            pengeluaran: [1500000, 2500000, 2000000, 4000000, 3000000, 5000000, 4200000, 4700000, 5200000, 4800000, 5500000, 5900000]
        },
        2023: {
            pemasukan: [2500000, 3500000, 4000000, 6000000, 5000000, 6500000, 6200000, 7000000, 8000000, 8200000, 8500000, 9000000],
            pengeluaran: [1000000, 1800000, 2000000, 2500000, 3000000, 3200000, 2800000, 3000000, 3500000, 3300000, 3600000, 4000000]
        }
    };

    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    let chartInstance = null;

    function renderChart(year) {
        const income = dataPerYear[year].pemasukan;
        const expense = dataPerYear[year].pengeluaran;

        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthLabels,
                datasets: [
                    {
                        label: 'Pemasukan',
                        data: income,
                        borderColor: '#198754',
                        backgroundColor: 'rgba(25, 135, 84, 0.2)',
                        tension: 0.4,
                        fill: true,
                    },
                    {
                        label: 'Pengeluaran',
                        data: expense,
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.2)',
                        tension: 0.4,
                        fill: true,
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (value) => 'Rp ' + value.toLocaleString('id-ID')
                        }
                    }
                }
            }
        });
    }

    // Inisialisasi
    renderChart(yearSelect.value);

    // Ganti tahun → render ulang chart
    yearSelect.addEventListener('change', (e) => renderChart(e.target.value));
}
