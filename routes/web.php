<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AppController;
use App\Http\Controllers\TikTokAuthController;
use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;

// ==== CSRF refresh untuk SPA (dipakai utils/csrf.js) ====
Route::get('/refresh-csrf', fn () => response()->json(['token' => csrf_token()]));

Route::get('/fs-info', function () {
    $root = config('filesystems.disks.public.root');
    $url  = config('filesystems.disks.public.url');

    // Coba tulis file test
    $okPut = false; $urlTest = null;
    try {
        Storage::disk('public')->put('health.txt', 'ok');
        $okPut = Storage::disk('public')->exists('health.txt');
        $urlTest = Storage::disk('public')->url('health.txt');
    } catch (\Throwable $e) {
        $okPut = $e->getMessage();
    }

    return response()->json([
        'public_path()' => public_path(),
        'disk_public_root' => $root,
        'disk_public_url'  => $url,
        'can_write'        => $okPut,
        'test_url'         => $urlTest,
    ]);
});

// ==== Auth (SPA) ====
Route::post('/login',  [AuthController::class, 'login'])->name('login');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
Route::get('/me',      [AuthController::class, 'me'])->name('me'); // optional untuk cek sesi

// ==== TikTok ====
Route::get('/auth/tiktok/redirect', [TikTokAuthController::class, 'redirect']);
Route::get('/auth/tiktok/callback', [TikTokAuthController::class, 'callback']);

Route::get('/me/tiktok', function (Request $request) {
    return response()->json([
        'tiktok_user_id'    => session('tiktok_user_id'),
        'tiktok_full_name'  => session('tiktok_full_name'),
        'tiktok_avatar_url' => session('tiktok_avatar_url'), // ← tambahin ini
    ]);
});


// ==== Catch-all SPA (tetap paling bawah) ====

    // Admin SPA (prefix /admin)
Route::get('/admin/{any?}', [AppController::class, 'admin'])
    ->where('any', '^(?!api|js|css|images|fonts|storage|vendor).*$');

// KOL SPA (root)
Route::get('/{any?}', [AppController::class, 'index'])
    ->where('any', '^(?!api|js|css|images|fonts|storage|vendor|admin).*$');
