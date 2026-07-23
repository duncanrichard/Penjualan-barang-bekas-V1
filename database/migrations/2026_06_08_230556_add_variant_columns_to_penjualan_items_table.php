<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('penjualan_items', function (Blueprint $table) {
            if (!Schema::hasColumn('penjualan_items', 'barang_variant_id')) {
                $table->foreignUuid('barang_variant_id')
                    ->nullable()
                    ->after('data_barang_id')
                    ->constrained('barang_variants')
                    ->nullOnDelete();
            }

            if (!Schema::hasColumn('penjualan_items', 'nama_varian')) {
                $table->string('nama_varian')
                    ->nullable()
                    ->after('nama_barang');
            }
        });
    }

    public function down(): void
    {
        Schema::table('penjualan_items', function (Blueprint $table) {
            if (Schema::hasColumn('penjualan_items', 'barang_variant_id')) {
                $table->dropConstrainedForeignId('barang_variant_id');
            }

            if (Schema::hasColumn('penjualan_items', 'nama_varian')) {
                $table->dropColumn('nama_varian');
            }
        });
    }
};
