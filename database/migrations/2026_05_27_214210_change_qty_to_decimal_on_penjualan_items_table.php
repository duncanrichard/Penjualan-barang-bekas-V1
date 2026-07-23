<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE penjualan_items
            ALTER COLUMN qty TYPE numeric(12,2)
            USING qty::numeric(12,2)
        ");

        DB::statement("
            ALTER TABLE penjualan_items
            ALTER COLUMN total TYPE numeric(15,2)
            USING total::numeric(15,2)
        ");

        DB::statement("
            ALTER TABLE penjualans
            ALTER COLUMN subtotal TYPE numeric(15,2)
            USING subtotal::numeric(15,2)
        ");

        DB::statement("
            ALTER TABLE penjualans
            ALTER COLUMN total_akhir TYPE numeric(15,2)
            USING total_akhir::numeric(15,2)
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE penjualan_items
            ALTER COLUMN qty TYPE integer
            USING ROUND(qty)::integer
        ");

        DB::statement("
            ALTER TABLE penjualan_items
            ALTER COLUMN total TYPE bigint
            USING ROUND(total)::bigint
        ");

        DB::statement("
            ALTER TABLE penjualans
            ALTER COLUMN subtotal TYPE bigint
            USING ROUND(subtotal)::bigint
        ");

        DB::statement("
            ALTER TABLE penjualans
            ALTER COLUMN total_akhir TYPE bigint
            USING ROUND(total_akhir)::bigint
        ");
    }
};
