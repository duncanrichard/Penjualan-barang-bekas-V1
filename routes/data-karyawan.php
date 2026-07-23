<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\MasterData\DataKaryawanController;

Route::prefix('data-karyawan')->name('data-karyawan.')->group(function () {
    Route::get('/', [DataKaryawanController::class, 'index'])->name('index');
    Route::post('/', [DataKaryawanController::class, 'store'])->name('store');
    Route::get('/{dataKaryawan}', [DataKaryawanController::class, 'show'])->name('show');
    Route::put('/{dataKaryawan}', [DataKaryawanController::class, 'update'])->name('update');
    Route::patch('/{dataKaryawan}', [DataKaryawanController::class, 'update'])->name('update');
    Route::delete('/{dataKaryawan}', [DataKaryawanController::class, 'destroy'])->name('destroy');
});
