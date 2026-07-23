<?php

use App\Models\DataBarang;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barang_variants', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('data_barang_id')
                ->constrained('data_barangs')
                ->cascadeOnDelete();

            $table->string('nama');
            $table->string('kode')->nullable();
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->unique(['data_barang_id', 'nama']);
            $table->index(['data_barang_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barang_variants');
    }
};
