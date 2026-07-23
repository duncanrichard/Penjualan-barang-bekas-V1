<?php

use App\Http\Controllers\ProdukStokController;
use Illuminate\Support\Facades\Route;

Route::get('/produk-stok', [ProdukStokController::class, 'index'])
    ->name('produk-stok.index');

Route::get('/produk-stok/options', [ProdukStokController::class, 'options'])
    ->name('produk-stok.options');

Route::get('/produk-stok/history', [ProdukStokController::class, 'history'])
    ->name('produk-stok.history');
