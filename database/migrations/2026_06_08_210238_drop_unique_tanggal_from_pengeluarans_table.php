<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE pengeluarans DROP CONSTRAINT IF EXISTS pengeluarans_tanggal_unique');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE pengeluarans ADD CONSTRAINT pengeluarans_tanggal_unique UNIQUE (tanggal)');
    }
};
