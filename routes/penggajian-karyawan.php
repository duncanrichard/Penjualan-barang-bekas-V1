<?php

use App\Http\Controllers\MasterData\PenggajianKaryawanController;
use Illuminate\Support\Facades\Route;

Route::apiResource('penggajian-karyawan', PenggajianKaryawanController::class);
