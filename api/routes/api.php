<?php

use App\Http\Controllers\PointController;
use Illuminate\Support\Facades\Route;

Route::get('/{city:slug}/points', [PointController::class, 'index']);
