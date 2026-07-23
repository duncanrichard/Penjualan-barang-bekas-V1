<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('borongan_item_outputs')) {
            Schema::create('borongan_item_outputs', function (Blueprint $table) {
                $table->uuid('id')->primary();

                $table->foreignUuid('borongan_item_id')
                    ->constrained('borongan_items')
                    ->cascadeOnDelete();

                $table->foreignUuid('data_barang_id')
                    ->constrained('data_barangs')
                    ->restrictOnDelete();

                $table->foreignUuid('barang_variant_id')
                    ->nullable()
                    ->constrained('barang_variants')
                    ->nullOnDelete();

                $table->string('jenis_barang')->default('jadi');
                $table->string('nama_varian')->nullable();

                $table->decimal('qty', 15, 2)->default(0);

                $table->timestamps();

                $table->index(['borongan_item_id']);
                $table->index(['data_barang_id', 'jenis_barang']);
                $table->index(['barang_variant_id']);
            });

            return;
        }

        Schema::table('borongan_item_outputs', function (Blueprint $table) {
            if (!Schema::hasColumn('borongan_item_outputs', 'barang_variant_id')) {
                $table->foreignUuid('barang_variant_id')
                    ->nullable()
                    ->after('data_barang_id')
                    ->constrained('barang_variants')
                    ->nullOnDelete();
            }

            if (!Schema::hasColumn('borongan_item_outputs', 'jenis_barang')) {
                $table->string('jenis_barang')
                    ->default('jadi')
                    ->after('barang_variant_id');
            }

            if (!Schema::hasColumn('borongan_item_outputs', 'nama_varian')) {
                $table->string('nama_varian')
                    ->nullable()
                    ->after('jenis_barang');
            }

            if (!Schema::hasColumn('borongan_item_outputs', 'qty')) {
                $table->decimal('qty', 15, 2)
                    ->default(0)
                    ->after('nama_varian');
            }
        });
    }

    public function down(): void
    {
        Schema::table('borongan_item_outputs', function (Blueprint $table) {
            if (Schema::hasColumn('borongan_item_outputs', 'barang_variant_id')) {
                $table->dropConstrainedForeignId('barang_variant_id');
            }

            if (Schema::hasColumn('borongan_item_outputs', 'nama_varian')) {
                $table->dropColumn('nama_varian');
            }
        });
    }
};
