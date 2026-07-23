<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Halaman utama aplikasi React.
|
*/

Route::view('/', 'app')->name('home');
Route::view('/login', 'app')->name('login');
Route::view('/dashboard', 'app')->name('dashboard');

/*
|--------------------------------------------------------------------------
| Authentication Routes
|--------------------------------------------------------------------------
*/

require __DIR__ . '/auth.php';

/*
|--------------------------------------------------------------------------
| Admin Routes
|--------------------------------------------------------------------------
*/

require __DIR__ . '/admin.php';

/*
|--------------------------------------------------------------------------
| Master Data Routes
|--------------------------------------------------------------------------
*/

require __DIR__ . '/kategori-barang.php';
require __DIR__ . '/data-barang.php';
require __DIR__ . '/barang-variant.php';
require __DIR__ . '/document-type.php';
require __DIR__ . '/data-customer.php';

/*
|--------------------------------------------------------------------------
| Karyawan Routes
|--------------------------------------------------------------------------
*/

require __DIR__ . '/data-karyawan.php';
require __DIR__ . '/setting-jam-kerja.php';
require __DIR__ . '/absensi-karyawan.php';

/*
|--------------------------------------------------------------------------
| Penggajian Routes
|--------------------------------------------------------------------------
*/

require __DIR__ . '/kategori-penggajian.php';
require __DIR__ . '/penggajian-karyawan.php';
require __DIR__ . '/potongan-kehadiran.php';
require __DIR__ . '/rekap-penggajian.php';
require __DIR__ . '/komponen-gaji-karyawan.php';

/*
|--------------------------------------------------------------------------
| Transaksi Routes
|--------------------------------------------------------------------------
*/

require __DIR__ . '/penjualan.php';
require __DIR__ . '/pembelian.php';
require __DIR__ . '/borongan.php';
require __DIR__ . '/pengeluaran.php';
require __DIR__ . '/produk-stok.php';

/*
|--------------------------------------------------------------------------
| Reminder Routes
|--------------------------------------------------------------------------
*/

require __DIR__ . '/document-reminder.php';

/*
|--------------------------------------------------------------------------
| Pengaturan Routes
|--------------------------------------------------------------------------
*/

require __DIR__ . '/company-profile.php';

/*
|--------------------------------------------------------------------------
| React Fallback
|--------------------------------------------------------------------------
|
| Harus ditempatkan paling bawah agar route API dan route aplikasi
| tidak tertangkap oleh fallback React.
|
*/

Route::fallback(function () {
    return view('app');
});
