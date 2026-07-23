<?php

use App\Http\Controllers\Transaksi\BoronganController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])
    ->prefix('borongan')
    ->name('borongan.')
    ->controller(BoronganController::class)
    ->group(function () {
        Route::get('/', 'index')
            ->name('index');

        /*
        |--------------------------------------------------------------------------
        | Pilihan form
        |--------------------------------------------------------------------------
        |
        | Route statis harus diletakkan sebelum /{borongan}.
        |
        */

        Route::get('/barang-options', 'barangOptions')
            ->name('barang-options');

        Route::get('/customer-options', 'customerOptions')
            ->name('customer-options');

        Route::post('/barang/{dataBarang}/variants', 'storeVariant')
            ->whereUuid('dataBarang')
            ->name('barang.variants.store');

        Route::post('/', 'store')
            ->name('store');

        Route::get('/{borongan}', 'show')
            ->whereUuid('borongan')
            ->name('show');

        Route::put('/{borongan}', 'update')
            ->whereUuid('borongan')
            ->name('update');

        Route::patch('/{borongan}', 'update')
            ->whereUuid('borongan')
            ->name('patch');

        Route::delete('/{borongan}', 'destroy')
            ->whereUuid('borongan')
            ->name('destroy');
    });
