<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('penggajian_karyawans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('data_karyawan_id')
                ->constrained('data_karyawans')
                ->cascadeOnDelete();

            $table->foreignId('kategori_penggajian_id')
                ->constrained('kategori_penggajians')
                ->cascadeOnDelete();

            $table->decimal('nominal', 15, 2)->default(0);
            $table->text('keterangan')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('penggajian_karyawans');
    }
};
