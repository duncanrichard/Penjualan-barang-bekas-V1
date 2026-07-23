<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Maintenance\DataKendaraanController;
use App\Http\Controllers\Maintenance\JadwalServiceController;

Route::middleware(['auth'])
    ->prefix('maintenance-kendaraan')
    ->name('maintenance-kendaraan.')
    ->group(function () {
        /*
        |--------------------------------------------------------------------------
        | Data Kendaraan
        |--------------------------------------------------------------------------
        */
        Route::prefix('data-kendaraan')
            ->name('data-kendaraan.')
            ->controller(DataKendaraanController::class)
            ->group(function () {
                Route::get('/', 'index')->name('index');
                Route::post('/', 'store')->name('store');

                Route::get('/{dataKendaraan}', 'show')
                    ->whereUuid('dataKendaraan')
                    ->name('show');

                Route::put('/{dataKendaraan}', 'update')
                    ->whereUuid('dataKendaraan')
                    ->name('update');

                Route::patch('/{dataKendaraan}', 'update')
                    ->whereUuid('dataKendaraan')
                    ->name('patch');

                Route::delete('/{dataKendaraan}', 'destroy')
                    ->whereUuid('dataKendaraan')
                    ->name('destroy');
            });

        /*
        |--------------------------------------------------------------------------
        | Jadwal Service
        |--------------------------------------------------------------------------
        */
        Route::prefix('jadwal-service')
            ->name('jadwal-service.')
            ->controller(JadwalServiceController::class)
            ->group(function () {
                Route::get('/', 'index')->name('index');
                Route::post('/', 'store')->name('store');

                Route::get('/{jadwalService}', 'show')
                    ->whereUuid('jadwalService')
                    ->name('show');

                Route::put('/{jadwalService}', 'update')
                    ->whereUuid('jadwalService')
                    ->name('update');

                Route::patch('/{jadwalService}', 'update')
                    ->whereUuid('jadwalService')
                    ->name('patch');

                Route::delete('/{jadwalService}', 'destroy')
                    ->whereUuid('jadwalService')
                    ->name('destroy');
            });
    });
