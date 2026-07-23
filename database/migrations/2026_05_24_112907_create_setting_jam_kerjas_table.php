<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('setting_jam_kerjas', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 100)->default('Jam Kerja Utama');
            $table->time('jam_masuk');
            $table->time('jam_pulang');
            $table->enum('status', ['Aktif', 'Nonaktif'])->default('Aktif');
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('setting_jam_kerjas');
    }
};
