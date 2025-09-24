<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ProjectTermController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\InfluencerRegistrationController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\InfluencerSubmissionController;
use App\Http\Controllers\TiktokDebugController;
use App\Http\Controllers\InfluencerSubmissionDraftController;


// Brand
Route::middleware(['web', 'auth'])->group(function () {
    Route::apiResource('brands', BrandController::class);
});

// Campaign
Route::middleware(['web', 'auth'])->group(function () {
    Route::apiResource('campaigns', CampaignController::class);
});


// Client
Route::get('/clients', [ClientController::class, 'index']);
Route::get('/clients/{id}', [ClientController::class, 'show']);
Route::post('/clients', [ClientController::class, 'store']);
Route::post('/clients/{id}', [ClientController::class, 'update']); // ganti dari PUT ke POST
Route::delete('/clients/{id}', [ClientController::class, 'destroy']);


// Project
Route::get('/projects', [ProjectController::class, 'index']);
Route::get('/projects/{id}', [ProjectController::class, 'show']);
Route::post('/projects', [ProjectController::class, 'store']);
Route::post('/projects/{id}', [ProjectController::class, 'update']); // pakai POST, bukan PUT
Route::delete('/projects/{id}', [ProjectController::class, 'destroy']);


// Project Term
Route::get('/project-terms', [ProjectTermController::class, 'index']);
Route::get('/project-terms/{id}', [ProjectTermController::class, 'show']);
Route::post('/project-terms', [ProjectTermController::class, 'store']);
Route::post('/project-terms/{id}', [ProjectTermController::class, 'update']); // pakai POST, bukan PUT
Route::delete('/project-terms/{id}', [ProjectTermController::class, 'destroy']);


// Invoice
Route::get('/project-terms/{id}/download-invoice', [InvoiceController::class, 'download']);


// Influencer Registration
Route::post('/influencer-registrations', [InfluencerRegistrationController::class, 'store']);
Route::post('/influencer-registrations/{id}', [InfluencerRegistrationController::class, 'update']);
Route::patch('/influencer-registrations/{id}', [InfluencerRegistrationController::class, 'update']);


// List registrations (dengan filter & include relasi campaign)
Route::get('/influencer-registrations', [InfluencerRegistrationController::class, 'index']);

// Ambil daftar campaign yang diikuti oleh TikTok user tertentu
Route::get('/influencers/{tiktok_user_id}/campaigns', [InfluencerRegistrationController::class, 'campaignsByTiktok']);

// (opsional) pakai session: /api/me/campaigns
Route::get('/me/campaigns', [InfluencerRegistrationController::class, 'myCampaigns']);

// Ambil daftar campaign yang diikuti oleh TikTok user tertentu
Route::get('/influencer-registrations/check', [InfluencerRegistrationController::class, 'check']);


/*
|--------------------------------------------------------------------------
| Influencer Submissions (upload link + bukti, invoice, dsb.)
|--------------------------------------------------------------------------
| - index   : list submission (filter by tiktok_user_id, campaign_id) — opsional untuk admin/history
| - store   : submit baru (FormData + file: proof_1, proof_2, invoice_file, review_proof_file)
| - show    : detail submission (opsional)
| - update  : revisi submission (pakai POST biar konsisten)
| - destroy : hapus (opsional)
*/

Route::get('/influencer-submissions',          [InfluencerSubmissionController::class, 'index']);
Route::post('/influencer-submissions',         [InfluencerSubmissionController::class, 'store']);

Route::get('/influencer-submissions/{id}',     [InfluencerSubmissionController::class, 'show'])->whereNumber('id');

// Terima POST (legacy), PUT & PATCH untuk update
Route::match(['POST','PUT','PATCH'], '/influencer-submissions/{id}', [InfluencerSubmissionController::class, 'update'])
    ->whereNumber('id');
    
Route::post('/influencer-submissions/{id}',    [InfluencerSubmissionController::class, 'update'])->whereNumber('id'); // POST utk update
Route::delete('/influencer-submissions/{id}',  [InfluencerSubmissionController::class, 'destroy'])->whereNumber('id');

Route::post(
    '/influencer-submissions/{id}/refresh-metrics',
    [InfluencerSubmissionController::class, 'refreshMetrics']
)->whereNumber('id');

Route::post('/_ping-refresh/{id}', function ($id) {
    return response()->json(['ok' => true, 'id' => (int) $id]);
})->whereNumber('id');

Route::match(['GET','POST'], 'debug/tiktok/video-stats', [TiktokDebugController::class, 'videoStats'])
    ->name('api.debug.tiktok.video-stats');

// Influencer Submission Draft

Route::get('/influencer-submissions/draft',  [InfluencerSubmissionDraftController::class, 'index'])->name('isd.index');
Route::get('/influencer-submissions/draft/with-influencer',  [InfluencerSubmissionDraftController::class, 'indexWithInfluencer'])
    ->name('isd.indexWithInfluencer'); // NEW
Route::post('/influencer-submissions/draft', [InfluencerSubmissionDraftController::class, 'store'])->name('isd.store');
Route::patch('/influencer-submissions/draft/{id}', [InfluencerSubmissionDraftController::class, 'update'])
    ->name('isd.update')->whereNumber('id');

// Contoh lain yang generic harus pakai whereNumber('id') biar gak nabrak:
Route::get('/influencer-submissions/{id}', [InfluencerSubmissionController::class, 'show'])->whereNumber('id');

// Manage Shipments (list + update khusus)
Route::get('/influencer-submissions/shipments', [InfluencerSubmissionController::class, 'shipmentsIndex']);
Route::patch('/influencer-submissions/{id}/shipment', [InfluencerSubmissionController::class, 'shipmentsUpdate'])->whereNumber('id');







