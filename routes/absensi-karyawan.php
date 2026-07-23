<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Transaksi\AbsensiKaryawanController;

Route::prefix('absensi-karyawan')->name('absensi-karyawan.')->group(function () {
    Route::get('/', [AbsensiKaryawanController::class, 'index'])->name('index');
    Route::get('/karyawan-options', [AbsensiKaryawanController::class, 'karyawanOptions'])->name('karyawan-options');

    Route::post('/masuk', [AbsensiKaryawanController::class, 'masuk'])->name('masuk');
    Route::post('/pulang', [AbsensiKaryawanController::class, 'pulang'])->name('pulang');
    Route::post('/tidak-hadir', [AbsensiKaryawanController::class, 'tidakHadir'])->name('tidak-hadir');

    Route::get('/detail/{karyawan}', [AbsensiKaryawanController::class, 'detail'])->name('detail');

    Route::delete('/{absensiKaryawan}', [AbsensiKaryawanController::class, 'destroy'])->name('destroy');
});
