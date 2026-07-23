<?php

use App\Http\Controllers\Transaksi\RekapPenggajianController;
use Illuminate\Support\Facades\Route;

Route::prefix('rekap-penggajian')
    ->name('rekap-penggajian.')
    ->controller(RekapPenggajianController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('/{karyawan}', 'show')->name('show');
    });
