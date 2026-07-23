<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('absensi_karyawans', function (Blueprint $table) {
            $table->id();

            $table->foreignId('karyawan_id')
                ->constrained('data_karyawans')
                ->cascadeOnDelete();

            $table->date('tanggal');
            $table->time('jam_masuk')->nullable();
            $table->time('jam_pulang')->nullable();

            $table->enum('keterangan_masuk', [
                'Telat',
                'Tepat Waktu',
                'Tidak Hadir',
            ])->nullable();

            $table->enum('keterangan_pulang', [
                'Lembur',
                'Tepat Waktu',
                'Tidak Hadir',
            ])->nullable();

            $table->text('keterangan')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['karyawan_id', 'tanggal']);
            $table->index('tanggal');
            $table->index('keterangan_masuk');
            $table->index('keterangan_pulang');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('absensi_karyawans');
    }
};
