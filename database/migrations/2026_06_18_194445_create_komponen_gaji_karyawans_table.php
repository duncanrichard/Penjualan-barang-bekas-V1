<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('komponen_gaji_karyawans', function (Blueprint $table) {
            $table->id();

            $table->foreignId('data_karyawan_id')
                ->constrained('data_karyawans')
                ->cascadeOnDelete();

            $table->foreignId('komponen_gaji_id')
                ->constrained('komponen_gajis')
                ->restrictOnDelete();

            $table->string('bulan', 7); // contoh: 2026-06

            $table->decimal('nominal_per_hari', 15, 2)->default(0);
            $table->unsignedInteger('jumlah_hari')->default(0);
            $table->decimal('total_nominal', 15, 2)->default(0);

            $table->text('keterangan')->nullable();

            $table->timestamps();

            $table->index(['data_karyawan_id', 'bulan']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('komponen_gaji_karyawans');
    }
};
