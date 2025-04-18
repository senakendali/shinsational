<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AppController;

Route::get('/{any}', [AppController::class, 'index'])
    ->where('any', '^(?!api|js|css|images|fonts|storage|vendor).*$');


Route::get('/refresh-csrf', function () {
    return response()->json([
        'token' => csrf_token(),
    ]);
});


