<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('borongan_items', function (Blueprint $table) {
            if (! Schema::hasColumn('borongan_items', 'input_jenis_barang')) {
                $table->string('input_jenis_barang', 20)
                    ->default('mentah')
                    ->after('nama_barang');
            }

            if (! Schema::hasColumn('borongan_items', 'output_data_barang_id')) {
                $table->uuid('output_data_barang_id')
                    ->nullable()
                    ->after('input_jenis_barang');
            }

            if (! Schema::hasColumn('borongan_items', 'output_jenis_barang')) {
                $table->string('output_jenis_barang', 20)
                    ->default('jadi')
                    ->after('output_data_barang_id');
            }

            if (! Schema::hasColumn('borongan_items', 'output_qty')) {
                $table->decimal('output_qty', 15, 2)
                    ->default(0)
                    ->after('output_jenis_barang');
            }
        });

        Schema::table('borongan_items', function (Blueprint $table) {
            if (Schema::hasColumn('borongan_items', 'output_data_barang_id')) {
                $table->foreign('output_data_barang_id')
                    ->references('id')
                    ->on('data_barangs')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('borongan_items', function (Blueprint $table) {
            try {
                $table->dropForeign(['output_data_barang_id']);
            } catch (\Throwable $e) {
                //
            }

            if (Schema::hasColumn('borongan_items', 'output_qty')) {
                $table->dropColumn('output_qty');
            }

            if (Schema::hasColumn('borongan_items', 'output_jenis_barang')) {
                $table->dropColumn('output_jenis_barang');
            }

            if (Schema::hasColumn('borongan_items', 'output_data_barang_id')) {
                $table->dropColumn('output_data_barang_id');
            }

            if (Schema::hasColumn('borongan_items', 'input_jenis_barang')) {
                $table->dropColumn('input_jenis_barang');
            }
        });
    }
};
