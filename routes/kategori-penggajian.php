<?php

use App\Http\Controllers\MasterData\KategoriPenggajianController;
use Illuminate\Support\Facades\Route;

Route::apiResource('kategori-penggajian', KategoriPenggajianController::class);
