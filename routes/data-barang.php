<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\MasterData\DataBarangController;

Route::prefix('data-barang')->name('data-barang.')->group(function () {
    Route::get('/', [DataBarangController::class, 'index'])->name('index');
    Route::get('/kategori-options', [DataBarangController::class, 'kategoriOptions'])->name('kategori-options');
    Route::post('/', [DataBarangController::class, 'store'])->name('store');
    Route::get('/{dataBarang}', [DataBarangController::class, 'show'])->name('show');
    Route::put('/{dataBarang}', [DataBarangController::class, 'update'])->name('update');
    Route::patch('/{dataBarang}', [DataBarangController::class, 'update'])->name('update');
    Route::delete('/{dataBarang}', [DataBarangController::class, 'destroy'])->name('destroy');
});
