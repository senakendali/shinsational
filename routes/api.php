<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ProjectTermController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\InfluencerRegistrationController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CampaignController;


// Brand
Route::apiResource('brands', BrandController::class);

// Campaign
Route::apiResource('campaigns', CampaignController::class);

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

// List registrations (dengan filter & include relasi campaign)
Route::get('/influencer-registrations', [InfluencerRegistrationController::class, 'index']);

// Ambil daftar campaign yang diikuti oleh TikTok user tertentu
Route::get('/influencers/{tiktok_user_id}/campaigns', [InfluencerRegistrationController::class, 'campaignsByTiktok']);

// (opsional) pakai session: /api/me/campaigns
Route::get('/me/campaigns', [InfluencerRegistrationController::class, 'myCampaigns']);

// Ambil daftar campaign yang diikuti oleh TikTok user tertentu
Route::get('/influencer-registrations/check', [InfluencerRegistrationController::class, 'check']);







