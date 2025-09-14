<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AppController;
use App\Http\Controllers\TikTokAuthController;
use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\InfluencerAccount;
use App\Http\Controllers\MeController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\PermissionController;
use App\Http\Controllers\Admin\UserController;


/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::middleware(['web', 'auth'])->prefix('api')->name('api.')->group(function () {
    // ==== CSRF helper (dipakai utils/csrf.js) ====
    Route::post('/csrf/refresh', function (Request $request) {
        $request->session()->regenerateToken();
        return response()->json(['token' => csrf_token()]);
    })->name('csrf.refresh');

    // ==== Current user + abilities (dipakai navbar) ====
    Route::get('/me', function (Request $request) {
        $u = $request->user()->loadMissing(['roles:id,name,guard_name']);
        $abilities = $u->getAllPermissions()->pluck('name')->values(); // Spatie
        // 1 user = 1 role (ambil pertama kalau ada)
        $roleName = optional($u->roles->first())->name;

        return response()->json([
            'id'         => $u->id,
            'name'       => $u->name,
            'email'      => $u->email,
            'role'       => $roleName,
            'roles'      => $u->roles->pluck('name')->values(), // kalau mau lihat juga
            'abilities'  => $abilities,
        ]);
    })->name('me');

    // ==== Permissions ====
    Route::apiResource('permissions', PermissionController::class)
        ->only(['index','store','show','update','destroy']);

    // ==== Roles (+sync-permissions) ====
    Route::apiResource('roles', RoleController::class)
        ->only(['index','store','show','update','destroy']);

    Route::post('roles/{role}/sync-permissions', [RoleController::class, 'syncPermissions'])
        ->name('roles.sync-permissions');

    // ==== Users (single role) ====
    Route::apiResource('users', UserController::class)
        ->only(['index','store','show','update','destroy']);

    // optional endpoints kalau kamu mau pakai helper terpisah
    Route::post('users/{user}/sync-roles', [UserController::class, 'syncRoles'])
        ->name('users.sync-roles');
    Route::post('users/{user}/sync-permissions', [UserController::class, 'syncPermissions'])
        ->name('users.sync-permissions');
});

Route::post('/api/me/link-tiktok', [MeController::class, 'linkTiktok'])
    ->name('me.link-tiktok')
    ->middleware(['web','auth']); // sesuaikan kalau KOL belum login

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

// Group API yang tetap pakai session ('auth' web), tanpa Sanctum
Route::middleware(['auth'])->prefix('api')->group(function () {
    // Roles
    Route::get   ('/roles',                    [RoleController::class, 'index']);
    Route::post  ('/roles',                    [RoleController::class, 'store']);
    Route::get   ('/roles/{role}',             [RoleController::class, 'show']);
    Route::patch ('/roles/{role}',             [RoleController::class, 'update']);
    Route::delete('/roles/{role}',             [RoleController::class, 'destroy']);

    // ===== Permissions
    Route::get   ('/permissions',                 [PermissionController::class, 'index']);
    Route::post  ('/permissions',                 [PermissionController::class, 'store']);
    Route::get   ('/permissions/{permission}',    [PermissionController::class, 'show']);
    Route::patch ('/permissions/{permission}',    [PermissionController::class, 'update']);
    Route::delete('/permissions/{permission}',    [PermissionController::class, 'destroy']);

    // ===== Users
    Route::get   ('/users',                       [UserController::class, 'index']);
    Route::post  ('/users',                       [UserController::class, 'store']);
    Route::get   ('/users/{user}',                [UserController::class, 'show']);
    Route::put ('/users/{user}',                [UserController::class, 'update']);
    Route::delete('/users/{user}',                [UserController::class, 'destroy']);

    // (opsional) Endpoints khusus sync—kalau mau pisah dari update:
    Route::post  ('/users/{user}/sync-roles',         [UserController::class, 'syncRoles']);
    Route::post  ('/users/{user}/sync-permissions',   [UserController::class, 'syncPermissions']);

    // Assign/sync permissions ke role
    Route::post  ('/roles/{role}/sync-permissions', [RoleController::class, 'syncPermissions']);
});

// ==== Auth (SPA) ====
Route::post('/login',  [AuthController::class, 'login'])->name('login');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
Route::get('/me',      [AuthController::class, 'me'])->name('me'); // optional untuk cek sesi

// ==== TikTok ====
Route::get('/auth/tiktok/redirect', [TikTokAuthController::class, 'redirect']);
Route::get('/auth/tiktok/callback', [TikTokAuthController::class, 'callback']);

Route::get('/auth/tiktok/reset', [TikTokAuthController::class, 'reset']);



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
