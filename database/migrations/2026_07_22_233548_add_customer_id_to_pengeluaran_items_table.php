<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pengeluaran_items', function (Blueprint $table) {
            $table->foreignUuid('customer_id')
                ->nullable()
                ->after('pengeluaran_id')
                ->constrained('data_customers')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pengeluaran_items', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropColumn('customer_id');
        });
    }
};
