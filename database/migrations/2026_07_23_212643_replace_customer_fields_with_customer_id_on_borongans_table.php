<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('borongans', function (Blueprint $table) {
            /*
             * Nullable supaya migration tetap berhasil ketika tabel
             * sudah memiliki transaksi borongan lama.
             */
            $table->foreignUuid('customer_id')
                ->nullable()
                ->after('nomor_nota')
                ->constrained('data_customers')
                ->nullOnDelete();
        });

        Schema::table('borongans', function (Blueprint $table) {
            $table->dropColumn([
                'nama_pelanggan',
                'no_wa_pelanggan',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('borongans', function (Blueprint $table) {
            $table->string('nama_pelanggan', 150)
                ->nullable()
                ->after('nomor_nota');

            $table->string('no_wa_pelanggan', 30)
                ->nullable()
                ->after('nama_pelanggan');
        });

        Schema::table('borongans', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropColumn('customer_id');
        });
    }
};
