<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AppController;
use App\Http\Controllers\TikTokAuthController;
use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\InfluencerAccount;

// ==== CSRF refresh untuk SPA (dipakai utils/csrf.js) ====
Route::get('/refresh-csrf', fn () => response()->json(['token' => csrf_token()]));

Route::get('/storage/{path}', function (string $path) {
    // keamanan minimal: batasi hanya folder tertentu
    // if (!str_starts_with($path, 'submissions/')) abort(403);

    if (!Storage::disk('public')->exists($path)) {
        abort(404);
    }
    // untuk gambar/file statis:
    return Storage::disk('public')->response($path); // set Content-Type otomatis
})->where('path', '.*');

Route::get('/files', function (Request $request) {
    $p = $request->query('p');
    if (!$p) abort(404);

    // Keamanan basic
    if (str_contains($p, '..')) abort(403);
    // kalau semua upload kamu ada di folder "submissions", batasi di sana:
    if (!str_starts_with($p, 'submissions/')) abort(403);

    if (!Storage::disk('public')->exists($p)) abort(404);

    // Stream ke browser dengan content-type yang tepat
    return Storage::disk('public')->response($p);
});

// ==== Auth (SPA) ====
Route::post('/login',  [AuthController::class, 'login'])->name('login');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
Route::get('/me',      [AuthController::class, 'me'])->name('me'); // optional untuk cek sesi

// ==== TikTok ====
Route::get('/auth/tiktok/redirect', [TikTokAuthController::class, 'redirect']);
Route::get('/auth/tiktok/callback', [TikTokAuthController::class, 'callback']);



Route::get('/me/tiktok', function (Request $request) {
    // urutan prioritas: session → cookie → null
    $openId = $request->session()->get('tiktok_user_id') ?: $request->cookie('tkoid');

    $acc = null;
    if ($openId) {
        $acc = InfluencerAccount::where('tiktok_user_id', $openId)->first();
    }

    return response()->json([
        'tiktok_user_id'    => $openId,
        'tiktok_username'   => $acc->tiktok_username ?? $request->session()->get('tiktok_username'),
        'tiktok_full_name'  => $acc->full_name       ?? $request->session()->get('tiktok_full_name'),
        'tiktok_avatar_url' => $acc->avatar_url      ?? $request->session()->get('tiktok_avatar_url'),
        'connected'         => (bool) $openId,
    ]);
});



// ==== Catch-all SPA (tetap paling bawah) ====

    // Admin SPA (prefix /admin)
Route::get('/admin/{any?}', [AppController::class, 'admin'])
    ->where('any', '^(?!api|js|css|images|fonts|storage|vendor).*$');

// KOL SPA (root)
Route::get('/{any?}', [AppController::class, 'index'])
    ->where('any', '^(?!api|js|css|images|fonts|storage|vendor|admin).*$');
