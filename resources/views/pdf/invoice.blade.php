<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice #{{ $term->id }}</title>
  <style>
    body {
      font-family: DejaVu Sans, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      margin: 0;
      padding: 30px;
    }

    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 30px;
    }

    .company-info {
      width: 60%;
    }

    .logo {
      width: 40%;
    }

    .invoice-header-border {
      border-bottom: 2px solid #388e3c;
      margin: 15px 0 25px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      gap: 30px;
    }

    .col {
      width: 48%;
    }

    .text-end { text-align: right; }
    .text-uppercase { text-transform: uppercase; }
    .text-muted { color: #777; }
    .text-orange { color: #388e3c; }
    .fw-bold { font-weight: bold; }

    .badge {
      display: inline-block;
      padding: 5px 12px;
      font-size: 11px;
      border-radius: 4px;
      color: #fff;
    }
    .success { background-color: #388e3c; }
    .warning { background-color: #f0ad4e; }

    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }

    .table th,
    .table td {
      padding: 8px;
      border: 1px solid #ccc;
      vertical-align: top;
    }

    .table th {
      background-color: #f5f5f5;
    }

    .small { font-size: 11px; }
    .mb-1 { margin-bottom: 5px; }
    .mb-2 { margin-bottom: 10px; }
    .mb-3 { margin-bottom: 15px; }
    .mb-4 { margin-bottom: 25px; }
    .mt-4 { margin-top: 25px; }
  </style>
</head>
<body>
  <div class="invoice">

    <!-- Header -->
    <div class="invoice-header">
      <div class="logo">
        <img src="{{ public_path('images/company-logo.png') }}" style="width: 150px;">
      </div>
      <div class="company-info text-end small">
        <strong class="text-uppercase">PT Sena Teknologi Solusindo</strong><br>
        AD Premiere Office Park, 17th floor, suite 4B,<br>
        Jl. TB Simatupang No. 5, South Jakarta 12550<br>
        +62 878 6482 2804<br>
        www.senstech.id<br>
        hello@senstech.id
      </div>
    </div>

    <div class="invoice-header-border"></div>

    <!-- Invoice Info -->
    <div class="row mb-3">
      <div class="col">
        <div class="text-muted">Invoice Number</div>
        <div class="fw-bold">INV-{{ $term->id }}</div>
      </div>
      <div class="col text-end">
        <div class="text-muted">Status</div>
        <span class="badge {{ $term->status === 'dibayar' ? 'success' : 'warning' }}">
          {{ strtoupper($term->status) }}
        </span>
      </div>
    </div>

    <div class="row mb-4">
      <div class="col">
        <div class="text-muted">Payment For</div>
        <div class="fw-bold">{{ $term->project->name ?? '-' }}</div>
      </div>
      <div class="col text-end">
        <div class="text-muted">{{ $term->status === 'dibayar' ? 'Paid At' : 'Due Date' }}</div>
        <div>{{ $term->paid_at ?? $term->due_date ?? '-' }}</div>
      </div>
    </div>

    <!-- From & To -->
    <div class="row mb-4">
      <div class="col">
        <div class="text-orange fw-bold mb-2">From</div>
        <div class="fw-bold text-uppercase">PT Sena Teknologi Solusindo</div>
        <div class="small text-muted">AD Premiere Office Park, 17th floor, suite 4B</div>
        <div class="small text-muted">Jl. TB Simatupang No. 5, South Jakarta 12550</div>
        <div class="small">+62 878 6482 2804</div>
        <div class="small">hello@senstech.id</div>
      </div>
      <div class="col text-end">
        <div class="text-orange fw-bold mb-2">To</div>
        <div class="fw-bold">{{ $term->project->client->name ?? '-' }}</div>
        <div class="small text-muted">{!! $term->project->client->address ?? '-' !!}</div>
        <div class="small">{{ $term->project->client->phone ?? '-' }}</div>
        <div class="small">{{ $term->project->client->email ?? '-' }}</div>
      </div>
    </div>

    <!-- Service Table -->
    <table class="table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-end">Amount (Rp)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{{ $term->description ?? '-' }}</td>
          <td class="text-end">{{ number_format($term->amount, 0, ',', '.') }}</td>
        </tr>
      </tbody>
    </table>

    <!-- Total -->
    <div class="text-end mt-4 mb-4">
      <strong>Total:</strong> Rp {{ number_format($term->amount, 0, ',', '.') }}
    </div>

    <!-- Payment Detail -->
    <div>
      <div class="fw-bold text-uppercase mb-2">Payment Detail</div>
      <table class="table" style="font-size: 11px;">
        <tr><td>Bank Name</td><td>: BCA</td></tr>
        <tr><td>Account Number</td><td>: 7340234396</td></tr>
        <tr><td>Account Holder</td><td>: PT Sena Teknologi Solusindo</td></tr>
        <tr><td>Notes</td><td>: Mohon sertakan nomor invoice saat melakukan pembayaran.</td></tr>
      </table>
    </div>
  </div>
</body>
</html>
