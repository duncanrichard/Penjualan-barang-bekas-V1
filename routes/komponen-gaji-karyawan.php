<?php

use App\Http\Controllers\Transaksi\KomponenGajiKaryawanController;
use Illuminate\Support\Facades\Route;

Route::prefix('komponen-gaji-karyawan')
    ->name('komponen-gaji-karyawan.')
    ->controller(KomponenGajiKaryawanController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::delete('/{komponenGajiKaryawan}', 'destroy')->name('destroy');
    });

Route::get('/komponen-gaji-options', [KomponenGajiKaryawanController::class, 'options'])
    ->name('komponen-gaji-options');
