<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('komponen_gaji_karyawans', function (Blueprint $table) {
            if (!Schema::hasColumn('komponen_gaji_karyawans', 'komponen_gaji_id')) {
                $table->foreignId('komponen_gaji_id')
                    ->nullable()
                    ->after('karyawan_id')
                    ->constrained('komponen_gajis')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('komponen_gaji_karyawans', function (Blueprint $table) {
            if (Schema::hasColumn('komponen_gaji_karyawans', 'komponen_gaji_id')) {
                $table->dropConstrainedForeignId('komponen_gaji_id');
            }
        });
    }
};
