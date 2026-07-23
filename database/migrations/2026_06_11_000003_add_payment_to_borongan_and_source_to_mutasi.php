<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('borongans', function (Blueprint $table) {
            if (!Schema::hasColumn('borongans', 'jenis_pembayaran_id')) {
                $table->foreignId('jenis_pembayaran_id')
                    ->nullable()
                    ->after('tanggal')
                    ->constrained('jenis_pembayarans')
                    ->nullOnDelete();
            }

            if (!Schema::hasColumn('borongans', 'metode_pembayaran')) {
                $table->string('metode_pembayaran', 100)
                    ->nullable()
                    ->after('jenis_pembayaran_id');
            }
        });

        Schema::table('pengeluaran_items', function (Blueprint $table) {
            if (!Schema::hasColumn('pengeluaran_items', 'source_type')) {
                $table->string('source_type', 100)
                    ->nullable()
                    ->after('catatan');
            }

            if (!Schema::hasColumn('pengeluaran_items', 'source_id')) {
                $table->uuid('source_id')
                    ->nullable()
                    ->after('source_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('borongans', function (Blueprint $table) {
            if (Schema::hasColumn('borongans', 'jenis_pembayaran_id')) {
                try {
                    $table->dropConstrainedForeignId('jenis_pembayaran_id');
                } catch (\Throwable $error) {
                    $table->dropColumn('jenis_pembayaran_id');
                }
            }

            if (Schema::hasColumn('borongans', 'metode_pembayaran')) {
                $table->dropColumn('metode_pembayaran');
            }
        });
    }
};
