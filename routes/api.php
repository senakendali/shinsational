<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ProjectTermController;
use App\Http\Controllers\Api\InvoiceController;


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





