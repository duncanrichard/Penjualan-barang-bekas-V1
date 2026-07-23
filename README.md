# Penjualan Barang Bekas V1

Sistem manajemen transaksi dan operasional toko barang bekas berbasis **Laravel 12**, **React**, dan **PostgreSQL**.

Aplikasi ini digunakan untuk mengelola data master, stok barang, transaksi pembelian, penjualan, borongan, mutasi transaksi, customer, metode pembayaran, serta pengiriman nota WhatsApp melalui Fonnte.

## Fitur Utama

### Dashboard

- Ringkasan transaksi dan operasional toko.
- Informasi pemasukan dan pengeluaran.
- Monitoring transaksi harian.

### Master Data

- Data barang.
- Data varian barang.
- Data customer.
- Data karyawan.
- Jenis pembayaran.
- Profil perusahaan.

### Pembelian

- Membuat transaksi pembelian barang.
- Memilih customer dari master Data Customer.
- Menampilkan nomor WhatsApp customer secara otomatis.
- Mengelola barang mentah dan barang jadi.
- Menghitung subtotal, catatan transaksi, Power Box, penyesuaian, dan total akhir.
- Mengirim nota pembelian melalui WhatsApp.
- Otomatis mencatat transaksi ke mutasi pengeluaran.

### Penjualan

- Menjual barang jadi tanpa varian atau berdasarkan varian.
- Memilih customer menggunakan pencarian nama atau nomor WhatsApp.
- Mengurangi stok barang secara otomatis.
- Menghitung subtotal, catatan transaksi, Power Box, penyesuaian, dan total akhir.
- Mengirim nota penjualan melalui WhatsApp.
- Otomatis mencatat pemasukan ke mutasi transaksi.

### Borongan

- Mengelola proses bahan mentah menjadi barang jadi.
- Membagi hasil produksi ke beberapa varian.
- Memilih customer dari master Data Customer.
- Mengelola jumlah input, output, harga, dan total borongan.
- Mengirim nota borongan melalui WhatsApp.
- Otomatis mencatat transaksi borongan ke mutasi transaksi.

### Mutasi Transaksi

- Membuka kasir harian.
- Menentukan limit atau deposit berdasarkan jenis pembayaran.
- Mencatat transaksi masuk dan keluar.
- Menampilkan customer pada transaksi terkait.
- Menghitung total cash, transfer, total keluar, dan sisa saldo.
- Menutup kasir dan mencetak rekap harian.

### Integrasi WhatsApp

- Pengiriman nota otomatis menggunakan Fonnte.
- Validasi koneksi perangkat Fonnte.
- Nomor tujuan diambil dari Data Customer.
- Format nota mencakup data perusahaan, customer, rincian transaksi, total pembayaran, dan tanda tangan.

## Teknologi

- PHP 8.2 atau lebih baru.
- Laravel 12.
- React.
- Vite.
- PostgreSQL.
- Tailwind CSS.
- DataTables.
- React Select.
- Fonnte WhatsApp API.

## Persyaratan Sistem

Pastikan perangkat sudah memiliki:

- PHP 8.2+.
- Composer.
- Node.js dan npm.
- PostgreSQL.
- Git.

## Instalasi

Clone repository:

```bash
git clone git@github.com:duncanrichard/Penjualan-barang-bekas-V1.git
cd Penjualan-barang-bekas-V1
