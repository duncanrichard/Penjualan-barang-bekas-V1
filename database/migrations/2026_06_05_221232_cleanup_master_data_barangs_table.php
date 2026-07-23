<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('data_barangs', function (Blueprint $table) {
            if (Schema::hasColumn('data_barangs', 'jenis_barang')) {
                $table->dropColumn('jenis_barang');
            }

            if (Schema::hasColumn('data_barangs', 'harga')) {
                $table->dropColumn('harga');
            }

            if (Schema::hasColumn('data_barangs', 'stok')) {
                $table->dropColumn('stok');
            }
        });
    }

    public function down(): void
    {
        Schema::table('data_barangs', function (Blueprint $table) {
            if (! Schema::hasColumn('data_barangs', 'jenis_barang')) {
                $table->string('jenis_barang', 20)->default('mentah')->after('nama_barang');
            }

            if (! Schema::hasColumn('data_barangs', 'harga')) {
                $table->integer('harga')->default(0)->after('jenis_barang');
            }

            if (! Schema::hasColumn('data_barangs', 'stok')) {
                $table->decimal('stok', 15, 2)->default(0)->after('harga');
            }
        });
    }
};
