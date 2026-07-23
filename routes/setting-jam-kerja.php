<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\MasterData\SettingJamKerjaController;

Route::prefix('setting-jam-kerja')->name('setting-jam-kerja.')->group(function () {
    Route::get('/', [SettingJamKerjaController::class, 'index'])->name('index');
    Route::get('/active', [SettingJamKerjaController::class, 'active'])->name('active');
    Route::post('/', [SettingJamKerjaController::class, 'store'])->name('store');
    Route::get('/{settingJamKerja}', [SettingJamKerjaController::class, 'show'])->name('show');
    Route::put('/{settingJamKerja}', [SettingJamKerjaController::class, 'update'])->name('update');
    Route::patch('/{settingJamKerja}', [SettingJamKerjaController::class, 'update'])->name('update');
    Route::delete('/{settingJamKerja}', [SettingJamKerjaController::class, 'destroy'])->name('destroy');
});
