<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pengeluaran_items', function (Blueprint $table) {
            if (!Schema::hasColumn('pengeluaran_items', 'jenis_pembayaran_id')) {
                $table->foreignId('jenis_pembayaran_id')
                    ->nullable()
                    ->after('metode_pembayaran')
                    ->constrained('jenis_pembayarans')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('pengeluaran_items', function (Blueprint $table) {
            if (Schema::hasColumn('pengeluaran_items', 'jenis_pembayaran_id')) {
                $table->dropConstrainedForeignId('jenis_pembayaran_id');
            }
        });
    }
};
