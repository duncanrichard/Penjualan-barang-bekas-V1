<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('data_barang_id');
            $table->string('jenis_barang', 20)->default('mentah');

            $table->decimal('qty_masuk', 15, 2)->default(0);
            $table->decimal('qty_keluar', 15, 2)->default(0);

            $table->string('source_type', 80);
            $table->uuid('source_id')->nullable();
            $table->uuid('source_item_id')->nullable();

            $table->date('tanggal')->nullable();
            $table->string('keterangan')->nullable();

            $table->timestamps();

            $table->foreign('data_barang_id')
                ->references('id')
                ->on('data_barangs')
                ->cascadeOnDelete();

            $table->index(['data_barang_id', 'jenis_barang']);
            $table->index(['source_type', 'source_id']);
            $table->index(['source_type', 'source_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
