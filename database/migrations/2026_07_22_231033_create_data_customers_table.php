<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('data_customers', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('nama_customer', 150);
            $table->string('no_wa', 30)->unique();
            $table->text('alamat')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('nama_customer');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('data_customers');
    }
};
