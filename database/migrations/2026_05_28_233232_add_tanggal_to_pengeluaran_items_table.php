<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pengeluaran_items', function (Blueprint $table) {
            if (!Schema::hasColumn('pengeluaran_items', 'tanggal')) {
                $table->date('tanggal')->nullable()->after('pengeluaran_id');
            }

            if (!Schema::hasColumn('pengeluaran_items', 'deskripsi')) {
                $table->text('deskripsi')->nullable()->after('jenis_pengeluaran');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pengeluaran_items', function (Blueprint $table) {
            if (Schema::hasColumn('pengeluaran_items', 'tanggal')) {
                $table->dropColumn('tanggal');
            }

            if (Schema::hasColumn('pengeluaran_items', 'deskripsi')) {
                $table->dropColumn('deskripsi');
            }
        });
    }
};
