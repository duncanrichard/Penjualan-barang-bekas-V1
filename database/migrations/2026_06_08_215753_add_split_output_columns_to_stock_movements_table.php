<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            if (!Schema::hasColumn('stock_movements', 'source_output_id')) {
                $table->uuid('source_output_id')
                    ->nullable()
                    ->after('source_item_id');

                $table->index('source_output_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            if (Schema::hasColumn('stock_movements', 'source_output_id')) {
                $table->dropIndex(['source_output_id']);
                $table->dropColumn('source_output_id');
            }
        });
    }
};
