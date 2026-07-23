<?php

use App\Http\Controllers\Transaksi\PenjualanController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])
    ->prefix('penjualan')
    ->name('penjualan.')
    ->controller(PenjualanController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');

        Route::get('/barang-options', 'barangOptions')
            ->name('barang-options');

        Route::get('/customer-options', 'customerOptions')
            ->name('customer-options');

        Route::get('/karyawan-options', 'karyawanOptions')
            ->name('karyawan-options');

        Route::post('/', 'store')->name('store');

        Route::get('/{penjualan}', 'show')
            ->whereUuid('penjualan')
            ->name('show');

        Route::put('/{penjualan}', 'update')
            ->whereUuid('penjualan')
            ->name('update');

        Route::patch('/{penjualan}', 'update')
            ->whereUuid('penjualan')
            ->name('patch');

        Route::delete('/{penjualan}', 'destroy')
            ->whereUuid('penjualan')
            ->name('destroy');
    });
