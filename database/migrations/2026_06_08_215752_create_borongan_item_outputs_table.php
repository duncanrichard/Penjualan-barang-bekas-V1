<?php

use App\Models\BoronganItem;
use App\Models\DataBarang;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('borongan_item_outputs', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('borongan_item_id')
                ->constrained('borongan_items')
                ->cascadeOnDelete();

            $table->foreignUuid('data_barang_id')
                ->constrained('data_barangs')
                ->restrictOnDelete();

            $table->string('kode_barang')->nullable();
            $table->string('nama_barang');
            $table->string('jenis_barang')->default('jadi');

            $table->decimal('qty', 15, 2)->default(0);
            $table->unsignedBigInteger('harga')->default(0);
            $table->decimal('total', 15, 2)->default(0);

            $table->timestamps();

            $table->index(['borongan_item_id']);
            $table->index(['data_barang_id', 'jenis_barang']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('borongan_item_outputs');
    }
};
