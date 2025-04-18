export function renderIncomeChart(containerId = "income-chart") {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="mb-0">Pendapatan Per Bulan</h5>
            <select id="income-year" class="form-select w-auto">
                <option value="2023">2023</option>
                <option value="2024" selected>2024</option>
                <option value="2025">2025</option>
            </select>
        </div>
        <canvas id="incomeChart" height="120"></canvas>
    `;

    const ctx = document.getElementById("incomeChart").getContext("2d");

    const dummyData = {
        2023: [500, 600, 800, 750, 900, 1000, 950, 1100, 1050, 1200, 1150, 1300],
        2024: [700, 800, 850, 950, 1100, 1250, 1300, 1400, 1500, 1600, 1700, 1800],
        2025: [800, 900, 1000, 1050, 1100, 1200, 1300, 1400, 1550, 1650, 1700, 1750],
    };

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
            datasets: [{
                label: 'Pendapatan (juta)',
                data: dummyData[2024],
                borderColor: 'rgba(75, 192, 192, 1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            }
        }
    });

    document.getElementById("income-year").addEventListener("change", (e) => {
        const selectedYear = e.target.value;
        chart.data.datasets[0].data = dummyData[selectedYear];
        chart.update();
    });
}
