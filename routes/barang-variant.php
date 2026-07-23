<?php

use App\Http\Controllers\MasterData\BarangVariantController;
use Illuminate\Support\Facades\Route;

Route::prefix('barang-variants')->name('barang-variants.')->group(function () {
    Route::get('/', [BarangVariantController::class, 'index'])->name('index');
    Route::get('/barang-options', [BarangVariantController::class, 'barangOptions'])->name('barang-options');
    Route::post('/', [BarangVariantController::class, 'store'])->name('store');
    Route::get('/{barangVariant}', [BarangVariantController::class, 'show'])->name('show');
    Route::put('/{barangVariant}', [BarangVariantController::class, 'update'])->name('update');
    Route::delete('/{barangVariant}', [BarangVariantController::class, 'destroy'])->name('destroy');
});
