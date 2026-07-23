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
        });
    }

    public function down(): void
    {
        Schema::table('pembelian_catatans', function (Blueprint $table) {
            if (Schema::hasColumn('pembelian_catatans', 'karyawan_ids')) {
                $table->dropColumn('karyawan_ids');
            }
        });
    }
};
