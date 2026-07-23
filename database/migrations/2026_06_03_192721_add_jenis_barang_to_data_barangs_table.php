<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('data_barangs', function (Blueprint $table) {
            if (! Schema::hasColumn('data_barangs', 'jenis_barang')) {
                $table->string('jenis_barang', 20)->default('mentah');
            }
        });

        DB::statement("
            ALTER TABLE data_barangs
            ADD CONSTRAINT data_barangs_jenis_barang_check
            CHECK (jenis_barang IN ('mentah', 'jadi'))
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE data_barangs
            DROP CONSTRAINT IF EXISTS data_barangs_jenis_barang_check
        ");

        Schema::table('data_barangs', function (Blueprint $table) {
            if (Schema::hasColumn('data_barangs', 'jenis_barang')) {
                $table->dropColumn('jenis_barang');
            }
        });
    }
};
