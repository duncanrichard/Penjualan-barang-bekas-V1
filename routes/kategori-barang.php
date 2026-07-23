<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\MasterData\KategoriBarangController;

Route::prefix('kategori-barang')->name('kategori-barang.')->group(function () {
    Route::get('/', [KategoriBarangController::class, 'index'])->name('index');
    Route::post('/', [KategoriBarangController::class, 'store'])->name('store');
    Route::get('/{kategoriBarang}', [KategoriBarangController::class, 'show'])->name('show');
    Route::put('/{kategoriBarang}', [KategoriBarangController::class, 'update'])->name('update');
    Route::patch('/{kategoriBarang}', [KategoriBarangController::class, 'update'])->name('update');
    Route::delete('/{kategoriBarang}', [KategoriBarangController::class, 'destroy'])->name('destroy');
});
