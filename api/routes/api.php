<?php

use App\Http\Controllers\ConfirmationController;
use App\Http\Controllers\PointController;
use Illuminate\Support\Facades\Route;

Route::get('/{city:slug}/points', [PointController::class, 'index']);
Route::get('/{city:slug}/points/{point}', [PointController::class, 'show'])->scopeBindings();

Route::middleware('throttle:30,1')->scopeBindings()->group(function () {
    Route::post('/{city:slug}/points/{point}/confirmation', [ConfirmationController::class, 'store']);
    Route::delete('/{city:slug}/points/{point}/confirmation', [ConfirmationController::class, 'destroy']);
});

Route::middleware('throttle:10,60')->post('/{city:slug}/points', [PointController::class, 'store']);
