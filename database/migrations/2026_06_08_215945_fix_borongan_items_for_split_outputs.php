<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('borongan_items', function (Blueprint $table) {
            if (!Schema::hasColumn('borongan_items', 'input_jenis_barang')) {
                $table->string('input_jenis_barang')
                    ->default('mentah')
                    ->after('nama_barang');
            }

            if (!Schema::hasColumn('borongan_items', 'output_data_barang_id')) {
                $table->uuid('output_data_barang_id')
                    ->nullable()
                    ->after('input_jenis_barang');
            }

            if (!Schema::hasColumn('borongan_items', 'output_jenis_barang')) {
                $table->string('output_jenis_barang')
                    ->default('jadi')
                    ->after('output_data_barang_id');
            }

            if (!Schema::hasColumn('borongan_items', 'output_qty')) {
                $table->decimal('output_qty', 15, 2)
                    ->default(0)
                    ->after('qty');
            }

            if (!Schema::hasColumn('borongan_items', 'harga')) {
                $table->unsignedBigInteger('harga')
                    ->default(0)
                    ->after('output_qty');
            }

            if (!Schema::hasColumn('borongan_items', 'total')) {
                $table->decimal('total', 15, 2)
                    ->default(0)
                    ->after('harga');
            }
        });

        Schema::table('borongan_items', function (Blueprint $table) {
            if (Schema::hasColumn('borongan_items', 'output_data_barang_id')) {
                $table->index('output_data_barang_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('borongan_items', function (Blueprint $table) {
            if (Schema::hasColumn('borongan_items', 'output_data_barang_id')) {
                $table->dropIndex(['output_data_barang_id']);
            }

            if (Schema::hasColumn('borongan_items', 'total')) {
                $table->dropColumn('total');
            }

            if (Schema::hasColumn('borongan_items', 'harga')) {
                $table->dropColumn('harga');
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
