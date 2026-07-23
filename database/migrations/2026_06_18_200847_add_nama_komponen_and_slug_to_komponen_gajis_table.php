<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('komponen_gajis', function (Blueprint $table) {
            if (!Schema::hasColumn('komponen_gajis', 'nama_komponen')) {
                $table->string('nama_komponen')->nullable()->after('id');
            }

            if (!Schema::hasColumn('komponen_gajis', 'slug')) {
                $table->string('slug')->nullable()->after('nama_komponen');
            }
        });

        $komponens = [
            'Uang Makan',
            'Uang Transportasi',
            'Tunjangan Jabatan',
            'Tunjangan Kehadiran',
            'Tunjangan Kinerja',
            'Bonus',
            'Insentif',
            'Uang Lembur Manual',
            'Tunjangan Pulsa',
            'Tunjangan Kesehatan',
        ];

        foreach ($komponens as $nama) {
            DB::table('komponen_gajis')->insert([
                'nama_komponen' => $nama,
                'slug' => Str::slug($nama),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        Schema::table('komponen_gajis', function (Blueprint $table) {
            $table->string('nama_komponen')->nullable(false)->change();
            $table->string('slug')->nullable(false)->change();
            $table->unique('slug');
        });
    }

    public function down(): void
    {
        Schema::table('komponen_gajis', function (Blueprint $table) {
            if (Schema::hasColumn('komponen_gajis', 'slug')) {
                $table->dropUnique(['slug']);
                $table->dropColumn('slug');
            }

            if (Schema::hasColumn('komponen_gajis', 'nama_komponen')) {
                $table->dropColumn('nama_komponen');
            }
        });
    }
};
