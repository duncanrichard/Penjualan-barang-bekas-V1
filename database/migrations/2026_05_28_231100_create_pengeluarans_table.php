<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pengeluarans', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->date('tanggal')->unique();
            $table->decimal('deposit_cash', 15, 2)->default(0);

            $table->decimal('total_cash', 15, 2)->default(0);
            $table->decimal('total_tf', 15, 2)->default(0);
            $table->decimal('total_pengeluaran', 15, 2)->default(0);
            $table->decimal('sisa_cash', 15, 2)->default(0);

            $table->text('catatan')->nullable();

            $table->timestamp('dibuka_pada')->nullable();
            $table->timestamp('ditutup_pada')->nullable();

            $table->string('status', 30)->default('buka');

            $table->timestamps();
            $table->softDeletes();

            $table->index(['tanggal', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pengeluarans');
    }
};
