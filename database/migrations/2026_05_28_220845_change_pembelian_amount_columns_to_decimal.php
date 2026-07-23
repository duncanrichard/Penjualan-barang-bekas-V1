<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE pembelian_items
            ALTER COLUMN qty TYPE NUMERIC(12,2)
            USING qty::numeric(12,2)
        ");

        DB::statement("
            ALTER TABLE pembelian_items
            ALTER COLUMN qty SET DEFAULT 0
        ");

        DB::statement("
            ALTER TABLE pembelian_items
            ALTER COLUMN total TYPE NUMERIC(15,2)
            USING total::numeric(15,2)
        ");

        DB::statement("
            ALTER TABLE pembelian_items
            ALTER COLUMN total SET DEFAULT 0
        ");

        DB::statement("
            ALTER TABLE pembelians
            ALTER COLUMN subtotal TYPE NUMERIC(15,2)
            USING subtotal::numeric(15,2)
        ");

        DB::statement("
            ALTER TABLE pembelians
            ALTER COLUMN subtotal SET DEFAULT 0
        ");

        DB::statement("
            ALTER TABLE pembelians
            ALTER COLUMN nilai_catatan_transaksi TYPE NUMERIC(15,2)
            USING nilai_catatan_transaksi::numeric(15,2)
        ");

        DB::statement("
            ALTER TABLE pembelians
            ALTER COLUMN nilai_catatan_transaksi SET DEFAULT 0
        ");

        DB::statement("
            ALTER TABLE pembelians
            ALTER COLUMN nilai_catatan_power_box TYPE NUMERIC(15,2)
            USING nilai_catatan_power_box::numeric(15,2)
        ");

        DB::statement("
            ALTER TABLE pembelians
            ALTER COLUMN nilai_catatan_power_box SET DEFAULT 0
        ");

        DB::statement("
            ALTER TABLE pembelians
            ALTER COLUMN penyesuaian TYPE NUMERIC(15,2)
            USING penyesuaian::numeric(15,2)
        ");

        DB::statement("
            ALTER TABLE pembelians
            ALTER COLUMN penyesuaian SET DEFAULT 0
        ");

        DB::statement("
            ALTER TABLE pembelians
            ALTER COLUMN total_akhir TYPE NUMERIC(15,2)
            USING total_akhir::numeric(15,2)
        ");

        DB::statement("
            ALTER TABLE pembelians
            ALTER COLUMN total_akhir SET DEFAULT 0
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE pembelian_items
            ALTER COLUMN qty TYPE INTEGER
            USING ROUND(qty)::integer
        ");

        DB::statement("
            ALTER TABLE pembelian_items
            ALTER COLUMN qty SET DEFAULT 0
        ");

        DB::statement("
            ALTER TABLE pembelian_items
            ALTER COLUMN total TYPE BIGINT
            USING ROUND(total)::bigint
        ");

        DB::statement("
            ALTER TABLE pembelian_items
            ALTER COLUMN total SET DEFAULT 0
        ");

        DB::statement("
            ALTER TABLE pembelians
            ALTER COLUMN subtotal TYPE BIGINT
            USING ROUND(subtotal)::bigint
        ");

        DB::statement("
            ALTER TABLE pembelians
            ALTER COLUMN subtotal SET DEFAULT 0
        ");

        DB::statement("
            ALTER TABLE pembelians
            ALTER COLUMN nilai_catatan_transaksi TYPE BIGINT
            USING ROUND(nilai_catatan_transaksi)::bigint
        ");

        DB::statement("
            ALTER TABLE pembelians
            ALTER COLUMN nilai_catatan_transaksi SET DEFAULT 0
        ");

        DB::statement("
            ALTER TABLE pembelians
            ALTER COLUMN nilai_catatan_power_box TYPE BIGINT
            USING ROUND(nilai_catatan_power_box)::bigint
        ");

        DB::statement("
            ALTER TABLE pembelians
            ALTER COLUMN nilai_catatan_power_box SET DEFAULT 0
        ");

        DB::statement("
            ALTER TABLE pembelians
            ALTER COLUMN penyesuaian TYPE BIGINT
            USING ROUND(penyesuaian)::bigint
        ");

        DB::statement("
            ALTER TABLE pembelians
            ALTER COLUMN penyesuaian SET DEFAULT 0
        ");

        DB::statement("
            ALTER TABLE pembelians
            ALTER COLUMN total_akhir TYPE BIGINT
            USING ROUND(total_akhir)::bigint
        ");

        DB::statement("
            ALTER TABLE pembelians
            ALTER COLUMN total_akhir SET DEFAULT 0
        ");
    }
};
