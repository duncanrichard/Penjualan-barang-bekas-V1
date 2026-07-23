<?php

use App\Http\Controllers\PotonganKehadiranController;
use Illuminate\Support\Facades\Route;

Route::prefix('potongan-kehadiran')
    ->name('potongan-kehadiran.')
    ->controller(PotonganKehadiranController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::get('/{potonganKehadiran}', 'show')->name('show');
        Route::put('/{potonganKehadiran}', 'update')->name('update');
        Route::patch('/{potonganKehadiran}', 'update')->name('update');
        Route::delete('/{potonganKehadiran}', 'destroy')->name('destroy');
    });
