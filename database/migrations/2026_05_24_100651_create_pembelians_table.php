<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pembelians', function (Blueprint $table) {
            $table->id();

            $table->string('nomor_nota', 50)->unique();
            $table->string('nama_supplier', 150)->nullable();
            $table->date('tanggal');

            $table->unsignedBigInteger('subtotal')->default(0);

            $table->text('catatan_transaksi')->nullable();
            $table->integer('nilai_catatan_transaksi')->default(0);

            $table->text('catatan_power_box')->nullable();
            $table->integer('nilai_catatan_power_box')->default(0);

            $table->integer('penyesuaian')->default(0);
            $table->unsignedBigInteger('total_akhir')->default(0);

            $table->text('catatan')->nullable();
            $table->string('kota', 100)->nullable();
            $table->date('tanggal_ttd')->nullable();
            $table->string('nama_ttd', 150)->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('tanggal');
            $table->index('nama_supplier');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pembelians');
    }
};
