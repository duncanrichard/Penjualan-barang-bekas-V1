<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('komponen_gaji_karyawans', function (Blueprint $table) {
            if (!Schema::hasColumn('komponen_gaji_karyawans', 'bulan')) {
                $table->string('bulan', 7)->nullable()->after('komponen_gaji_id');
            }

            if (!Schema::hasColumn('komponen_gaji_karyawans', 'nominal_per_hari')) {
                $table->decimal('nominal_per_hari', 15, 2)->default(0)->after('bulan');
            }

            if (!Schema::hasColumn('komponen_gaji_karyawans', 'jumlah_hari')) {
                $table->unsignedInteger('jumlah_hari')->default(0)->after('nominal_per_hari');
            }

            if (!Schema::hasColumn('komponen_gaji_karyawans', 'total_nominal')) {
                $table->decimal('total_nominal', 15, 2)->default(0)->after('jumlah_hari');
            }

            if (!Schema::hasColumn('komponen_gaji_karyawans', 'keterangan')) {
                $table->text('keterangan')->nullable()->after('total_nominal');
            }
        });
    }

    public function down(): void
    {
        Schema::table('komponen_gaji_karyawans', function (Blueprint $table) {
            if (Schema::hasColumn('komponen_gaji_karyawans', 'keterangan')) {
                $table->dropColumn('keterangan');
            }

            if (Schema::hasColumn('komponen_gaji_karyawans', 'total_nominal')) {
                $table->dropColumn('total_nominal');
            }

            if (Schema::hasColumn('komponen_gaji_karyawans', 'jumlah_hari')) {
                $table->dropColumn('jumlah_hari');
            }

            if (Schema::hasColumn('komponen_gaji_karyawans', 'nominal_per_hari')) {
                $table->dropColumn('nominal_per_hari');
            }

            if (Schema::hasColumn('komponen_gaji_karyawans', 'bulan')) {
                $table->dropColumn('bulan');
            }
        });
    }
};
