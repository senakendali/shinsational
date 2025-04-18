<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProjectTerm;
use Barryvdh\DomPDF\Facade\Pdf;

class InvoiceController extends Controller
{
    public function download($id)
    {
        $term = ProjectTerm::with('project.client')->findOrFail($id);

        $pdf = Pdf::loadView('pdf.invoice', ['term' => $term]);

        return $pdf->download("invoice-{$term->id}.pdf");
    }
}

