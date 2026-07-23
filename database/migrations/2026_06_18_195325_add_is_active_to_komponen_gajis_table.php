<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('komponen_gajis', function (Blueprint $table) {
            if (!Schema::hasColumn('komponen_gajis', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('slug');
            }
        });
    }

    public function down(): void
    {
        Schema::table('komponen_gajis', function (Blueprint $table) {
            if (Schema::hasColumn('komponen_gajis', 'is_active')) {
                $table->dropColumn('is_active');
            }
        });
    }
};
