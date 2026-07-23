<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('borongans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nomor_nota', 100)->unique();
            $table->string('nama_pelanggan', 150);
            $table->date('tanggal');
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('penyesuaian', 15, 2)->default(0);
            $table->decimal('total_akhir', 15, 2)->default(0);
            $table->text('catatan')->nullable();
            $table->string('kota', 100)->nullable();
            $table->date('tanggal_ttd')->nullable();
            $table->string('nama_ttd', 150)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('borongans');
    }
};
