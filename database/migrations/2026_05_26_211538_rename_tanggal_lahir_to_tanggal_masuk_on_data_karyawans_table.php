<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('data_karyawans', function (Blueprint $table) {
            $table->renameColumn('tanggal_lahir', 'tanggal_masuk');
        });
    }

    public function down(): void
    {
        Schema::table('data_karyawans', function (Blueprint $table) {
            $table->renameColumn('tanggal_masuk', 'tanggal_lahir');
        });
    }
};
