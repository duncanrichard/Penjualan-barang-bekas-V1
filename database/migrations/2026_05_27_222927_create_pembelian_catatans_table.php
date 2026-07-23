<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pembelian_catatans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('pembelian_id');

            // transaksi = mengurangi total pembelian
            // power_box = menambah total pembelian
            $table->string('tipe', 50);

            $table->text('catatan')->nullable();
            $table->decimal('nominal', 15, 2)->default(0);

            $table->timestamps();

            $table->foreign('pembelian_id')
                ->references('id')
                ->on('pembelians')
                ->cascadeOnDelete();

            $table->index(['pembelian_id', 'tipe']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pembelian_catatans');
    }
};
