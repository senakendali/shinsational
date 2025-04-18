import { projectTermService } from '../../services/projectTermService.js';
import { renderBreadcrumb } from '../../components/breadcrumb.js';
import { showLoader, hideLoader } from '../../components/loader.js';
import { showToast } from '../../utils/toast.js';

export async function render(target, params = {}, query = {}, labelOverride = null) {
  const id = params.id;
  showLoader();
  target.innerHTML = '';
  renderBreadcrumb(target, `/project-terms/${id}/invoice`, labelOverride);

  try {
    const data = await projectTermService.get(id);

    target.innerHTML += `
      <div class="main-content">
        <div class="row">
          <div class="col-lg-12 mb-3">
            <div id="invoice-content" class="invoice p-4 bg-white rounded shadow-sm">
              <div class="d-flex justify-content-between align-items-center invoice-header mb-3">
                <img src="/images/company-logo.png" style="width: 150px;">
                <div class="text-end small lh-sm">
                  <strong class="text-uppercase">PT Sena Teknologi Solusindo</strong><br>
                  AD Premiere Office Park, 17th floor, suite 4B,<br>
                  Jl. TB Simatupang No. 5, South Jakarta 12550<br>
                  +62 878 6482 2804<br>
                  www.senstech.id<br>
                  hello@senstech.id
                </div>
              </div>

              <div class="invoice-header-border"></div>

              <div class="d-flex justify-content-between mb-3">
                <div>
                  <div class="fw-semibold text-muted">Invoice Number</div>
                  <div class="h5">INV-${data.id}</div>
                </div>
                <div class="text-end">
                  <div class="fw-semibold text-muted">Status</div>
                  <span class="badge bg-${data.status === 'dibayar' ? 'success' : 'warning'} text-uppercase">
                    ${data.status}
                  </span>
                </div>
              </div>

              <div class="d-flex justify-content-between mb-4">
                <div>
                  <div class="text-muted">Payment For</div>
                  <div class="fw-bold">${data.project?.name || '-'}</div>
                </div>
                <div class="text-end">
                  <div class="text-muted">${data.status === 'dibayar' ? 'Paid At' : 'Due Date'}</div>
                  <div>${data.paid_at || data.due_date || '-'}</div>
                </div>
              </div>

              <div class="row mb-4">
                <div class="col-md-6">
                  <div class="text-orange fw-bold">From</div>
                  <div class="text-uppercase">PT Sena Teknologi Solusindo</div>
                  <div class="small text-muted">AD Premiere Office Park, 17th floor, suite 4B, Jl. TB Simatupang No. 5, South Jakarta 12550</div>
                  <div class="small">+62 878 6482 2804</div>
                  <div class="small">hello@senstech.id</div>
                </div>
                <div class="col-md-6 text-end">
                  <div class="text-orange fw-bold">To</div>
                  <div class="fw-bold">${data.project?.client?.name || '-'}</div>
                  <div class="small text-muted">${data.project?.client?.address || '-'}</div>
                  <div class="small">${data.project?.client?.phone || '-'}</div>
                  <div class="small">${data.project?.client?.email || '-'}</div>
                </div>
              </div>

              <div class="table-responsive mb-3">
                <table class="table table-bordered">
                  <thead class="table-light">
                    <tr>
                      <th>Description</th>
                      <th class="text-end">Amount (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>${data.description || '-'}</td>
                      <td class="text-end">${Number(data.amount).toLocaleString('id-ID')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="text-end me-2 mb-4">
                <strong>Total:</strong> Rp ${Number(data.amount).toLocaleString('id-ID')}
              </div>

              <div class="mb-4">
                <div class="fw-bold text-uppercase">Payment Detail</div>
                <table class="table table-sm border">
                  <tr><td>Bank Name</td><td>: BCA</td></tr>
                  <tr><td>Account Number</td><td>: 7340234396</td></tr>
                  <tr><td>Account Holder</td><td>: PT Sena Teknologi Solusindo</td></tr>
                  <tr><td>Notes</td><td>: Mohon sertakan nomor invoice saat melakukan pembayaran.</td></tr>
                </table>
              </div>

              <div class="text-end">
                <button id="downloadBtn" class="btn btn-outline-secondary"><i class="bi bi-download"></i> Download Invoice</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Load jsPDF & html2canvas dari CDN jika belum ada
    if (!window.jspdf || !window.html2canvas) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    }

    document.getElementById('downloadBtn').addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = `/api/project-terms/${data.id}/download-invoice`;
        link.target = '_blank'; // kalau mau tab baru
        link.click();
    });
      

  } catch (err) {
    showToast('Gagal memuat invoice', 'error');
    target.innerHTML = `<div class="alert alert-danger">Gagal memuat invoice.</div>`;
    console.error(err);
  } finally {
    hideLoader();
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
