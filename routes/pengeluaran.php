<?php

use App\Http\Controllers\Transaksi\PengeluaranController;
use Illuminate\Support\Facades\Route;

Route::prefix('pengeluaran')
    ->name('pengeluaran.')
    ->controller(PengeluaranController::class)
    ->group(function () {
        /*
        |--------------------------------------------------------------------------
        | Data utama pengeluaran
        |--------------------------------------------------------------------------
        */
        Route::get('/', 'index')->name('index');

        /*
        |--------------------------------------------------------------------------
        | Kasir aktif
        |--------------------------------------------------------------------------
        */
        Route::get('/active', 'active')->name('active');

        /*
        |--------------------------------------------------------------------------
        | Jenis pembayaran untuk select option
        |--------------------------------------------------------------------------
        | Route ini wajib ada untuk frontend:
        | GET /pengeluaran/payment-options
        */
        Route::get('/payment-options', 'paymentOptions')->name('payment-options');

        /*
        |--------------------------------------------------------------------------
        | Buka kasir harian
        |--------------------------------------------------------------------------
        */
        Route::post('/', 'store')->name('store');

        /*
        |--------------------------------------------------------------------------
        | Detail pengeluaran
        |--------------------------------------------------------------------------
        */
        Route::get('/{pengeluaran}', 'show')
            ->whereUuid('pengeluaran')
            ->name('show');

        /*
        |--------------------------------------------------------------------------
        | Update buka kasir / limit pembayaran
        |--------------------------------------------------------------------------
        */
        Route::put('/{pengeluaran}', 'update')
            ->whereUuid('pengeluaran')
            ->name('update');

        Route::patch('/{pengeluaran}', 'update')
            ->whereUuid('pengeluaran')
            ->name('patch');

        /*
        |--------------------------------------------------------------------------
        | Tambah item pengeluaran harian
        |--------------------------------------------------------------------------
        */
        Route::post('/{pengeluaran}/items', 'storeItem')
            ->whereUuid('pengeluaran')
            ->name('items.store');

        /*
        |--------------------------------------------------------------------------
        | Update item pengeluaran
        |--------------------------------------------------------------------------
        */
        Route::put('/{pengeluaran}/items/{item}', 'updateItem')
            ->whereUuid('pengeluaran')
            ->whereUuid('item')
            ->name('items.update');

        Route::patch('/{pengeluaran}/items/{item}', 'updateItem')
            ->whereUuid('pengeluaran')
            ->whereUuid('item')
            ->name('items.patch');

        /*
        |--------------------------------------------------------------------------
        | Hapus item pengeluaran
        |--------------------------------------------------------------------------
        */
        Route::delete('/{pengeluaran}/items/{item}', 'destroyItem')
            ->whereUuid('pengeluaran')
            ->whereUuid('item')
            ->name('items.destroy');

        /*
        |--------------------------------------------------------------------------
        | Tutup toko / tutup kasir
        |--------------------------------------------------------------------------
        */
        Route::post('/{pengeluaran}/close', 'close')
            ->whereUuid('pengeluaran')
            ->name('close');

        /*
        |--------------------------------------------------------------------------
        | Hapus data pengeluaran harian
        |--------------------------------------------------------------------------
        */
        Route::delete('/{pengeluaran}', 'destroy')
            ->whereUuid('pengeluaran')
            ->name('destroy');
    });
