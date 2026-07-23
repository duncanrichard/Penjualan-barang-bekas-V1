<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('komponen_gaji_karyawans', function (Blueprint $table) {
            if (!Schema::hasColumn('komponen_gaji_karyawans', 'karyawan_id')) {
                $table->uuid('karyawan_id')->nullable()->after('id');
            }
        });

        Schema::table('komponen_gaji_karyawans', function (Blueprint $table) {
            $table->foreign('karyawan_id')
                ->references('id')
                ->on('data_karyawans')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('komponen_gaji_karyawans', function (Blueprint $table) {
            if (Schema::hasColumn('komponen_gaji_karyawans', 'karyawan_id')) {
                $table->dropForeign(['karyawan_id']);
                $table->dropColumn('karyawan_id');
            }
        });
    }
};
