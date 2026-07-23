<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pembelian_items', function (Blueprint $table) {
            if (! Schema::hasColumn('pembelian_items', 'jenis_barang')) {
                $table->string('jenis_barang', 20)
                    ->default('mentah')
                    ->after('nama_barang');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pembelian_items', function (Blueprint $table) {
            if (Schema::hasColumn('pembelian_items', 'jenis_barang')) {
                $table->dropColumn('jenis_barang');
            }
        });
    }
};
