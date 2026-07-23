<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('penjualans', function (Blueprint $table) {
            if (!Schema::hasColumn('penjualans', 'no_wa_pelanggan')) {
                $table->string('no_wa_pelanggan', 30)->nullable()->after('nama_pelanggan');
            }
        });
    }

    public function down(): void
    {
        Schema::table('penjualans', function (Blueprint $table) {
            if (Schema::hasColumn('penjualans', 'no_wa_pelanggan')) {
                $table->dropColumn('no_wa_pelanggan');
            }
        });
    }
};
