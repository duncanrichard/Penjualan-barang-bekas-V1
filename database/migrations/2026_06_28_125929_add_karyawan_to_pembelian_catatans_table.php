<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pembelian_catatans', function (Blueprint $table) {
            if (!Schema::hasColumn('pembelian_catatans', 'karyawan_ids')) {
                $table->json('karyawan_ids')->nullable()->after('nominal');
            }

            if (!Schema::hasColumn('pembelian_catatans', 'nominal_per_karyawan')) {
                $table->decimal('nominal_per_karyawan', 15, 2)->default(0)->after('karyawan_ids');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pembelian_catatans', function (Blueprint $table) {
            if (Schema::hasColumn('pembelian_catatans', 'nominal_per_karyawan')) {
                $table->dropColumn('nominal_per_karyawan');
            }

            if (Schema::hasColumn('pembelian_catatans', 'karyawan_ids')) {
                $table->dropColumn('karyawan_ids');
            }
        });
    }
};
