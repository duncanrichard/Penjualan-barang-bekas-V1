<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('data_karyawans', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 150);
            $table->string('no_wa', 30)->nullable();
            $table->text('alamat_ktp')->nullable();
            $table->text('alamat_domisili')->nullable();
            $table->date('tanggal_lahir')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('nama');
            $table->index('no_wa');
            $table->index('tanggal_lahir');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('data_karyawans');
    }
};
