<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pengeluarans', function (Blueprint $table) {
            if (!Schema::hasColumn('pengeluarans', 'opened_at')) {
                $table->timestamp('opened_at')->nullable();
            }

            if (!Schema::hasColumn('pengeluarans', 'closed_at')) {
                $table->timestamp('closed_at')->nullable();
            }

            if (!Schema::hasColumn('pengeluarans', 'catatan_buka')) {
                $table->text('catatan_buka')->nullable();
            }

            if (!Schema::hasColumn('pengeluarans', 'catatan_tutup')) {
                $table->text('catatan_tutup')->nullable();
            }

            if (!Schema::hasColumn('pengeluarans', 'total_pengeluaran')) {
                $table->decimal('total_pengeluaran', 15, 2)->default(0);
            }
        });
    }

    public function down(): void
    {
        Schema::table('pengeluarans', function (Blueprint $table) {
            if (Schema::hasColumn('pengeluarans', 'opened_at')) {
                $table->dropColumn('opened_at');
            }

            if (Schema::hasColumn('pengeluarans', 'closed_at')) {
                $table->dropColumn('closed_at');
            }

            if (Schema::hasColumn('pengeluarans', 'catatan_buka')) {
                $table->dropColumn('catatan_buka');
            }

            if (Schema::hasColumn('pengeluarans', 'catatan_tutup')) {
                $table->dropColumn('catatan_tutup');
            }

            if (Schema::hasColumn('pengeluarans', 'total_pengeluaran')) {
                $table->dropColumn('total_pengeluaran');
            }
        });
    }
};
