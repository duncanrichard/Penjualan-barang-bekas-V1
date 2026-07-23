<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('borongan_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('borongan_id');
            $table->uuid('data_barang_id');
            $table->string('kode_barang', 100)->nullable();
            $table->string('nama_barang', 255);
            $table->decimal('qty', 12, 2)->default(0);
            $table->bigInteger('harga')->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->timestamps();

            $table->foreign('borongan_id')
                ->references('id')
                ->on('borongans')
                ->cascadeOnDelete();

            $table->foreign('data_barang_id')
                ->references('id')
                ->on('data_barangs')
                ->restrictOnDelete();

            $table->index(['borongan_id', 'data_barang_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('borongan_items');
    }
};
