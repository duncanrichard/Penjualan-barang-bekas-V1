<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Reminder & Jadwal Routes
|--------------------------------------------------------------------------
| Route view untuk halaman React.
|--------------------------------------------------------------------------
*/

Route::view('/reminder-jadwal', 'app')->name('reminder-jadwal');
Route::view('/reminder-jadwal/data-kendaraan', 'app')->name('reminder-jadwal.data-kendaraan');
Route::view('/reminder-jadwal/reminder-kendaraan', 'app')->name('reminder-jadwal.reminder-kendaraan');
Route::view('/reminder-jadwal/riwayat-perawatan', 'app')->name('reminder-jadwal.riwayat-perawatan');
