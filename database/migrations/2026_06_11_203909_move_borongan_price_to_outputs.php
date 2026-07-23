<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('borongan_item_outputs', function (Blueprint $table) {
            if (!Schema::hasColumn('borongan_item_outputs', 'harga')) {
                $table->unsignedBigInteger('harga')->default(0)->after('qty');
            }

            if (!Schema::hasColumn('borongan_item_outputs', 'total')) {
                $table->decimal('total', 15, 2)->default(0)->after('harga');
            }
        });

        Schema::table('borongan_items', function (Blueprint $table) {
            $dropColumns = [];

            if (Schema::hasColumn('borongan_items', 'output_data_barang_id')) {
                $dropColumns[] = 'output_data_barang_id';
            }

            if (Schema::hasColumn('borongan_items', 'output_jenis_barang')) {
                $dropColumns[] = 'output_jenis_barang';
            }

            if (Schema::hasColumn('borongan_items', 'harga')) {
                $dropColumns[] = 'harga';
            }

            if (Schema::hasColumn('borongan_items', 'total')) {
                $dropColumns[] = 'total';
            }

            if (!empty($dropColumns)) {
                $table->dropColumn($dropColumns);
            }
        });
    }

    public function down(): void
    {
        Schema::table('borongan_items', function (Blueprint $table) {
            if (!Schema::hasColumn('borongan_items', 'output_data_barang_id')) {
                $table->uuid('output_data_barang_id')->nullable()->after('input_jenis_barang');
            }

            if (!Schema::hasColumn('borongan_items', 'output_jenis_barang')) {
                $table->string('output_jenis_barang', 50)->default('jadi')->after('output_data_barang_id');
            }

            if (!Schema::hasColumn('borongan_items', 'harga')) {
                $table->unsignedBigInteger('harga')->default(0)->after('output_qty');
            }

            if (!Schema::hasColumn('borongan_items', 'total')) {
                $table->decimal('total', 15, 2)->default(0)->after('harga');
            }
        });

        Schema::table('borongan_item_outputs', function (Blueprint $table) {
            $dropColumns = [];

            if (Schema::hasColumn('borongan_item_outputs', 'harga')) {
                $dropColumns[] = 'harga';
            }

            if (Schema::hasColumn('borongan_item_outputs', 'total')) {
                $dropColumns[] = 'total';
            }

            if (!empty($dropColumns)) {
                $table->dropColumn($dropColumns);
            }
        });
    }
};
