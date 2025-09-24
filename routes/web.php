<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Request;

use App\Http\Controllers\AppController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TikTokAuthController;

use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\PermissionController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Api\InfluencerSubmissionController;
use App\Http\Controllers\Api\InfluencerAccountController;


use App\Http\Controllers\ProfileController;
use App\Http\Controllers\MeController;
use App\Models\InfluencerAccount;

/*
|--------------------------------------------------------------------------
| Web Routes (SPA + Session Guard)
|--------------------------------------------------------------------------
| - Semua endpoint API yang butuh session/login taruh di sini (middleware web)
| - Admin SPA di /admin/**
*/

/** -----------------------------------------------------------------
 *  CSRF refresh untuk SPA (boleh tanpa auth, tapi butuh session "web")
 *  utils/csrf.js akan hit ke sini saat 419
 *  ----------------------------------------------------------------- */
Route::prefix('api')->middleware(['web'])->group(function () {
    Route::post('/csrf/refresh', function (Request $request) {
        $request->session()->regenerateToken();
        return response()->json(['token' => csrf_token()]);
    })->name('api.csrf.refresh');
});

/** -----------------------------------------------------------------
 *  API PROTECTED (butuh login) — session guard "web"
 *  ----------------------------------------------------------------- */
Route::prefix('api')->middleware(['web','auth'])->group(function () {

    // ===== Current user + abilities (dipakai navbar / guard)
    Route::get('/me', [ProfileController::class, 'show'])->name('api.me');
    Route::patch('/me', [ProfileController::class, 'updateProfile'])->name('api.me.update');
    Route::patch('/me/password', [ProfileController::class, 'updatePassword'])->name('api.me.password');
    Route::post('/me/avatar', [ProfileController::class, 'updateAvatar'])->name('api.me.avatar.upload');
    Route::delete('/me/avatar', [ProfileController::class, 'deleteAvatar'])->name('api.me.avatar.delete');

    // (opsional) integrasi tiktok milik user login
    Route::post('/me/link-tiktok', [MeController::class, 'linkTiktok'])->name('api.me.link-tiktok');

    // ===== Permissions
    Route::apiResource('permissions', PermissionController::class)
        ->only(['index','store','show','update','destroy']);

    // ===== Roles (+sync-permissions)
    Route::apiResource('roles', RoleController::class)
        ->only(['index','store','show','update','destroy']);
    Route::post('roles/{role}/sync-permissions', [RoleController::class, 'syncPermissions'])
        ->name('api.roles.sync-permissions');

    // ===== Users (single role enforced di controller)
    Route::apiResource('users', UserController::class)
        ->only(['index','store','show','update','destroy']);
    // optional helpers
    Route::post('users/{user}/sync-roles', [UserController::class, 'syncRoles'])->name('api.users.sync-roles');
    Route::post('users/{user}/sync-permissions', [UserController::class, 'syncPermissions'])->name('api.users.sync-permissions');

    // ===== Influencer Submissions export
    Route::get('influencer-submissions/export', [InfluencerSubmissionController::class, 'export'])
    ->name('api.influencer-submissions.export');

    Route::get('/influencer-submissions/kols/export', [InfluencerSubmissionController::class, 'exportKols']);

    // ===== Influencer Submissions: submit draft (KOL)
    /*Route::post('influencer-submissions/draft', [InfluencerSubmissionController::class, 'submitDraft'])
    ->name('api.influencer-submissions.submit-draft');

    Route::post('influencer-submissions/{id}/draft-approval', [InfluencerSubmissionController::class, 'approveDraft']);*/

    // List + filter (campaign_id, q) + pagination
    Route::get('influencer-accounts', [InfluencerAccountController::class, 'index'])
        ->name('api.influencer-accounts.index');

    // Refresh token KOL by admin action (button di KOL list)
    Route::post('influencer-accounts/{id}/refresh-token', [InfluencerAccountController::class, 'refreshToken'])
        ->whereNumber('id')
        ->name('api.influencer-accounts.refresh-token');


});

/** -----------------------------------------------------------------
 *  Auth endpoints (SPA)
 *  ----------------------------------------------------------------- */
Route::post('/login',  [AuthController::class, 'login'])->name('auth.login');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

// ✅ Route GET bernama "login" untuk redirect middleware Authenticate
//    Arahkan ke halaman SPA admin login
Route::get('/admin/login', [AppController::class, 'loginAdmin'])->name('login');

/** -----------------------------------------------------------------
 *  TikTok OAuth
 *  ----------------------------------------------------------------- */
Route::get('/auth/tiktok/redirect', [TikTokAuthController::class, 'redirect']);
Route::get('/auth/tiktok/callback', [TikTokAuthController::class, 'callback']);
Route::get('/auth/tiktok/reset', [TikTokAuthController::class, 'reset']);

Route::get('/me/tiktok', function (Request $request) {
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

/** -----------------------------------------------------------------
 *  File serving helper (publik)
 *  ----------------------------------------------------------------- */
Route::get('/storage/{path}', function (string $path) {
    if (!Storage::disk('public')->exists($path)) abort(404);
    return Storage::disk('public')->response($path);
})->where('path', '.*');

Route::get('/files', function (Request $request) {
    $p = $request->query('p');
    if (!$p) abort(404);
    if (str_contains($p, '..')) abort(403);
    if (!str_starts_with($p, 'submissions/')) abort(403);
    if (!Storage::disk('public')->exists($p)) abort(404);
    return Storage::disk('public')->response($p);
});

/** -----------------------------------------------------------------
 *  Catch-all SPA (taruh paling bawah)
 *  ----------------------------------------------------------------- */

// Admin SPA (prefix /admin)
Route::get('/admin/{any?}', [AppController::class, 'admin'])
    ->where('any', '^(?!api|js|css|images|fonts|storage|vendor).*$');

// KOL / public SPA (root)
Route::get('/{any?}', [AppController::class, 'index'])
    ->where('any', '^(?!api|js|css|images|fonts|storage|vendor|admin).*$');
