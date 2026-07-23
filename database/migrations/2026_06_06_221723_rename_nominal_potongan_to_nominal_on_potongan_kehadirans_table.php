<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('potongan_kehadirans', function (Blueprint $table) {
            $table->renameColumn('nominal_potongan', 'nominal');
        });
    }

    public function down(): void
    {
        Schema::table('potongan_kehadirans', function (Blueprint $table) {
            $table->renameColumn('nominal', 'nominal_potongan');
        });
    }
};
