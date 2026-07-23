<?php

use App\Http\Controllers\Transaksi\PembelianController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])
    ->prefix('pembelian')
    ->name('pembelian.')
    ->controller(PembelianController::class)
    ->group(function () {
        /*
        |--------------------------------------------------------------------------
        | Daftar dan opsi form
        |--------------------------------------------------------------------------
        |
        | Semua route statis harus diletakkan sebelum /{pembelian}.
        |
        */

        Route::get('/', 'index')
            ->name('index');

        Route::get('/barang-options', 'barangOptions')
            ->name('barang-options');

        Route::get('/customer-options', 'customerOptions')
            ->name('customer-options');

        Route::get('/karyawan-options', 'karyawanOptions')
            ->name('karyawan-options');

        /*
        |--------------------------------------------------------------------------
        | Simpan pembelian
        |--------------------------------------------------------------------------
        */

        Route::post('/', 'store')
            ->name('store');

        /*
        |--------------------------------------------------------------------------
        | Detail, update, dan hapus
        |--------------------------------------------------------------------------
        */

        Route::get('/{pembelian}', 'show')
            ->whereUuid('pembelian')
            ->name('show');

        Route::put('/{pembelian}', 'update')
            ->whereUuid('pembelian')
            ->name('update');

        Route::patch('/{pembelian}', 'update')
            ->whereUuid('pembelian')
            ->name('patch');

        Route::delete('/{pembelian}', 'destroy')
            ->whereUuid('pembelian')
            ->name('destroy');
    });
