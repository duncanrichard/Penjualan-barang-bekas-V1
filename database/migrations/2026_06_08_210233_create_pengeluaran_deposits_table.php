<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pengeluaran_deposits', function (Blueprint $table) {
            $table->id();
            $table->uuid('pengeluaran_id');
            $table->foreignId('jenis_pembayaran_id')->constrained('jenis_pembayarans')->cascadeOnDelete();
            $table->decimal('nominal', 15, 2)->default(0);
            $table->text('catatan')->nullable();
            $table->timestamps();

            $table->foreign('pengeluaran_id')
                ->references('id')
                ->on('pengeluarans')
                ->cascadeOnDelete();

            $table->unique(['pengeluaran_id', 'jenis_pembayaran_id'], 'pengeluaran_deposit_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pengeluaran_deposits');
    }
};
