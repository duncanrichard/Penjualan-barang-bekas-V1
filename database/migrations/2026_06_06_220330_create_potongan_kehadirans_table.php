<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('potongan_kehadirans', function (Blueprint $table) {
            $table->id();
            $table->string('nama_kebijakan');
            $table->enum('jenis_potongan', ['jam_masuk', 'jam_keluar']);
            $table->integer('toleransi_menit')->default(0);
            $table->decimal('nominal_potongan', 15, 2)->default(0);
            $table->text('keterangan')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('potongan_kehadirans');
    }
};
