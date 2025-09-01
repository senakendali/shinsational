<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AppController;
use App\Http\Controllers\TikTokAuthController;
use Illuminate\Http\Request;

Route::get('/auth/tiktok/redirect', [TikTokAuthController::class, 'redirect']);
Route::get('/auth/tiktok/callback', [TikTokAuthController::class, 'callback']);

// TikTok
Route::get('/me/tiktok', function (Request $request) {
    return response()->json([
        'tiktok_user_id' => session('tiktok_user_id'),
        //'tiktok_username' => session('tiktok_username'),
        'tiktok_full_name' => session('tiktok_full_name'),
    ]);
});

Route::get('/{any}', [AppController::class, 'index'])
    ->where('any', '^(?!api|js|css|images|fonts|storage|vendor).*$');


Route::get('/refresh-csrf', function () {
    return response()->json([
        'token' => csrf_token(),
    ]);
});


