<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pembelians', function (Blueprint $table) {
            /*
             * Nullable agar migration tidak gagal apabila sudah ada
             * transaksi pembelian lama yang belum memiliki customer.
             */
            $table->foreignUuid('customer_id')
                ->nullable()
                ->after('nomor_nota')
                ->constrained('data_customers')
                ->nullOnDelete();
        });

        Schema::table('pembelians', function (Blueprint $table) {
            $table->dropColumn([
                'nama_supplier',
                'no_wa_pelanggan',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('pembelians', function (Blueprint $table) {
            $table->string('nama_supplier', 150)
                ->nullable()
                ->after('nomor_nota');

            $table->string('no_wa_pelanggan', 30)
                ->nullable()
                ->after('nama_supplier');
        });

        Schema::table('pembelians', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropColumn('customer_id');
        });
    }
};
