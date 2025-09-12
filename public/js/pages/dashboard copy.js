export function render(target, path, query = {}, labelOverride = null) {
    const v = window.BUILD_VERSION || Date.now();

    target.innerHTML = "";

    // Konten utama dashboard keuangan
    target.innerHTML += `
        <!-- Ringkasan Keuangan -->
        <div class="container-fluid">
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="card text-white text-center bg-success mb-3">
                        <div class="card-body">
                            <h5 class="card-title">Total Brand</h5>
                            <p class="card-text fs-3">200</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-white text-center bg-primary mb-3">
                        <div class="card-body">
                            <h5 class="card-title">Total Campaign</h5>
                            <p class="card-text fs-3">100</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-white text-center bg-danger mb-3">
                        <div class="card-body">
                            <h5 class="card-title">Total KOL</h5>
                            <p class="card-text fs-3">1000</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-white text-center bg-warning mb-3">
                        <div class="card-body">
                            <h5 class="card-title">Total Post</h5>
                            <p class="card-text fs-3">1340</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Grafik Arus Kas dan Proyek Aktif -->
            <div class="d-flex gap-4 mb-5 pt-2">
                <!-- Grafik Arus Kas -->
                <div class="flex-grow-1 w-50">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="mb-0">Grafik Total Engagement Campaign </h5>
                        <select id="campaignFilter" class="form-select w-auto">
                            <option value="Campaign A" selected>Campaign A</option>
                            <option value="Campaign B">Campaign B</option>
                            <option value="Campaign C">Campaign C</option>
                        </select>
                    </div>
                    <canvas id="cashflowChart"></canvas>
                </div>
                
                <!-- Campaign Aktif -->
                <div class="w-50">
                    <h5>Campaign Aktif Saat Ini</h5>
                    <ul class="list-group pt-4">
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                        Campaign A <span class="badge bg-success">Berjalan</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        Campaign B <span class="badge bg-success">Berjalan</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        Campaign C <span class="badge bg-warning">Pending</span>
                    </li>
                </ul>
            </div>
        </div>

        </div>
    `;

    setupflowChart();

    Promise.all([
        import(`/js/components/header.js?v=${v}`),
        import(`/js/components/breadcrumb.js?v=${v}`),
    ])
        .then(([headerAdmin, breadcrumb]) => {
            const { renderHeader } = headerAdmin;
            const { renderBreadcrumb } = breadcrumb;

            renderHeader("header");
            renderBreadcrumb(target, path, labelOverride);
        })
        .catch((err) => {
            console.error("[Import components failed]", err);
        });
}

function setupflowChart() {
    const ctx = document.getElementById("cashflowChart").getContext("2d");
    const campaignSelect = document.getElementById("campaignFilter");

    const dataTable = {
        view: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200],
        like: [120, 220, 320, 420, 520, 620, 720, 820, 920, 1020, 1120, 1220],
        comment: [12, 30, 230, 330, 530, 630, 730, 800, 830, 930, 1230],
        share: [140, 240, 340, 440, 540, 640, 740, 840, 940, 1040, 1140, 1240],
    };

    let chartInstance = null;

    function renderChart() {
        // Calculate totals
        const totalView = dataTable.view.reduce((a, b) => a + b, 0);
        const totalLike = dataTable.like.reduce((a, b) => a + b, 0);
        const totalComment = dataTable.comment.reduce((a, b) => a + b, 0);
        const totalShare = dataTable.share.reduce((a, b) => a + b, 0);

        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: ["View", "Like", "Comment", "Share"],
                datasets: [
                    {
                        label: "Total",
                        data: [totalView, totalLike, totalComment, totalShare],
                        backgroundColor: [
                            "rgba(194, 239, 12, 0.6)",
                            "rgba(13, 110, 253, 0.6)",
                            "rgba(131, 53, 220, 0.6)",
                            "rgba(255, 159, 64, 0.6)",
                        ],
                        borderWidth: 1,
                        barThickness: 100,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                    },
                },
            },
        });
    }

    // Initialize
    renderChart(campaignSelect.value);

    // Update on campaign change (if you want to change totals based on filter, update dataTable accordingly)
    campaignSelect.addEventListener("change", (e) =>
        renderChart(e.target.value)
    );
}
