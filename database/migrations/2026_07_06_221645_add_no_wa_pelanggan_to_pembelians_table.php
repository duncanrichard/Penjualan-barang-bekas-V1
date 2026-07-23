<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pembelians', function (Blueprint $table) {
            if (!Schema::hasColumn('pembelians', 'no_wa_pelanggan')) {
                $table->string('no_wa_pelanggan', 30)->nullable()->after('nama_supplier');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pembelians', function (Blueprint $table) {
            if (Schema::hasColumn('pembelians', 'no_wa_pelanggan')) {
                $table->dropColumn('no_wa_pelanggan');
            }
        });
    }
};
