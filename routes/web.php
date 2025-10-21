<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HomeController;

Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('/start', [HomeController::class, 'start'])->name('start');

Route::get('/question/{number}', [HomeController::class, 'question'])
    ->where('number', '1|2|3|4|5')
    ->name('question');

/* === HASIL QUIZ === */
Route::get('/result', [HomeController::class, 'result'])->name('result');

Route::get('/registration', [HomeController::class, 'register'])->name('registration');
Route::post('/api/registration', [HomeController::class, 'submitDataParticipant'])->name('api.registration');
