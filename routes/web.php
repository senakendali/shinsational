<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AppController;
use App\Http\Controllers\TikTokAuthController;

Route::get('/auth/tiktok/redirect', [TikTokAuthController::class, 'redirect']);
Route::get('/auth/tiktok/callback', [TikTokAuthController::class, 'callback']);

Route::get('/{any}', [AppController::class, 'index'])
    ->where('any', '^(?!api|js|css|images|fonts|storage|vendor).*$');


Route::get('/refresh-csrf', function () {
    return response()->json([
        'token' => csrf_token(),
    ]);
});


