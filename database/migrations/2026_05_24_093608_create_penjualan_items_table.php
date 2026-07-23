<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('penjualan_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('penjualan_id')
                ->constrained('penjualans')
                ->cascadeOnDelete();

            $table->foreignId('data_barang_id')
                ->nullable()
                ->constrained('data_barangs')
                ->nullOnDelete();

            $table->string('kode_barang', 50)->nullable();
            $table->string('nama_barang', 150);

            $table->unsignedInteger('qty')->default(0);
            $table->unsignedBigInteger('harga')->default(0);
            $table->unsignedBigInteger('total')->default(0);

            $table->timestamps();

            $table->index('data_barang_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('penjualan_items');
    }
};
