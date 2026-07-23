<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('nama_perusahaan', 150);
            $table->text('alamat')->nullable();
            $table->string('no_wa', 25)->nullable();

            /*
             * Token disimpan menggunakan cast encrypted
             * pada model CompanyProfile.
             */
            $table->text('fonnte_api_token')->nullable();

            /*
             * Menentukan apakah integrasi Fonnte digunakan
             * oleh aplikasi.
             */
            $table->boolean('fonnte_enabled')->default(false);

            /*
             * Status hasil pemeriksaan terakhir.
             * connected, disconnected, atau unchecked.
             */
            $table->string('fonnte_connection_status', 30)
                ->default('unchecked');

            $table->text('fonnte_connection_message')->nullable();
            $table->timestamp('fonnte_last_checked_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_profiles');
    }
};
