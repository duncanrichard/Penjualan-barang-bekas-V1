<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('penjualans', function (Blueprint $table) {
            if (!Schema::hasColumn('penjualans', 'jenis_pembayaran_id')) {
                $table->foreignId('jenis_pembayaran_id')
                    ->nullable()
                    ->after('tanggal')
                    ->constrained('jenis_pembayarans')
                    ->nullOnDelete();
            }

            if (!Schema::hasColumn('penjualans', 'metode_pembayaran')) {
                $table->string('metode_pembayaran')->nullable()->after('jenis_pembayaran_id');
            }
        });

        Schema::table('pengeluaran_deposits', function (Blueprint $table) {
            if (!Schema::hasColumn('pengeluaran_deposits', 'source_type')) {
                $table->string('source_type')->nullable()->after('catatan');
            }

            if (!Schema::hasColumn('pengeluaran_deposits', 'source_id')) {
                $table->uuid('source_id')->nullable()->after('source_type');
            }

            if (Schema::hasColumn('pengeluaran_deposits', 'source_type') && Schema::hasColumn('pengeluaran_deposits', 'source_id')) {
                $table->index(['source_type', 'source_id'], 'pengeluaran_deposits_source_index');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pengeluaran_deposits', function (Blueprint $table) {
            if (Schema::hasColumn('pengeluaran_deposits', 'source_type') && Schema::hasColumn('pengeluaran_deposits', 'source_id')) {
                $table->dropIndex('pengeluaran_deposits_source_index');
            }

            $dropColumns = [];

            if (Schema::hasColumn('pengeluaran_deposits', 'source_id')) {
                $dropColumns[] = 'source_id';
            }

            if (Schema::hasColumn('pengeluaran_deposits', 'source_type')) {
                $dropColumns[] = 'source_type';
            }

            if (!empty($dropColumns)) {
                $table->dropColumn($dropColumns);
            }
        });

        Schema::table('penjualans', function (Blueprint $table) {
            if (Schema::hasColumn('penjualans', 'jenis_pembayaran_id')) {
                $table->dropConstrainedForeignId('jenis_pembayaran_id');
            }

            if (Schema::hasColumn('penjualans', 'metode_pembayaran')) {
                $table->dropColumn('metode_pembayaran');
            }
        });
    }
};
