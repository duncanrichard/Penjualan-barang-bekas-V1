<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('penjualan_catatans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('penjualan_id');

            // transaksi = menambah total
            // power_box = mengurangi total
            $table->string('tipe', 50);

            $table->text('catatan')->nullable();
            $table->decimal('nominal', 15, 2)->default(0);

            $table->timestamps();

            $table->foreign('penjualan_id')
                ->references('id')
                ->on('penjualans')
                ->cascadeOnDelete();

            $table->index(['penjualan_id', 'tipe']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('penjualan_catatans');
    }
};
