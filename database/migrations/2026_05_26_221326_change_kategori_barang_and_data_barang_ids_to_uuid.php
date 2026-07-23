<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

        /*
        |--------------------------------------------------------------------------
        | Tambah kolom temp UUID
        |--------------------------------------------------------------------------
        */
        DB::statement('ALTER TABLE kategori_barangs ADD COLUMN IF NOT EXISTS uuid_temp uuid');
        DB::statement('ALTER TABLE data_barangs ADD COLUMN IF NOT EXISTS uuid_temp uuid');
        DB::statement('ALTER TABLE data_barangs ADD COLUMN IF NOT EXISTS kategori_uuid_temp uuid');

        DB::statement('ALTER TABLE penjualan_items ADD COLUMN IF NOT EXISTS data_barang_uuid_temp uuid');
        DB::statement('ALTER TABLE pembelian_items ADD COLUMN IF NOT EXISTS data_barang_uuid_temp uuid');

        /*
        |--------------------------------------------------------------------------
        | Isi UUID temp
        |--------------------------------------------------------------------------
        */
        DB::statement('UPDATE kategori_barangs SET uuid_temp = COALESCE(uuid_temp, gen_random_uuid())');
        DB::statement('UPDATE data_barangs SET uuid_temp = COALESCE(uuid_temp, gen_random_uuid())');

        /*
        |--------------------------------------------------------------------------
        | Mapping relasi kategori barang ke data barang
        |--------------------------------------------------------------------------
        */
        DB::statement("
            UPDATE data_barangs
            SET kategori_uuid_temp = kategori_barangs.uuid_temp
            FROM kategori_barangs
            WHERE data_barangs.kategori_id = kategori_barangs.id
        ");

        /*
        |--------------------------------------------------------------------------
        | Mapping relasi data barang ke penjualan_items
        |--------------------------------------------------------------------------
        */
        DB::statement("
            UPDATE penjualan_items
            SET data_barang_uuid_temp = data_barangs.uuid_temp
            FROM data_barangs
            WHERE penjualan_items.data_barang_id = data_barangs.id
        ");

        /*
        |--------------------------------------------------------------------------
        | Mapping relasi data barang ke pembelian_items
        |--------------------------------------------------------------------------
        */
        DB::statement("
            UPDATE pembelian_items
            SET data_barang_uuid_temp = data_barangs.uuid_temp
            FROM data_barangs
            WHERE pembelian_items.data_barang_id = data_barangs.id
        ");

        /*
        |--------------------------------------------------------------------------
        | Drop foreign key yang bergantung ke data_barangs dan kategori_barangs
        |--------------------------------------------------------------------------
        */
        DB::statement('ALTER TABLE penjualan_items DROP CONSTRAINT IF EXISTS penjualan_items_data_barang_id_foreign');
        DB::statement('ALTER TABLE pembelian_items DROP CONSTRAINT IF EXISTS pembelian_items_data_barang_id_foreign');
        DB::statement('ALTER TABLE data_barangs DROP CONSTRAINT IF EXISTS data_barangs_kategori_id_foreign');

        /*
        |--------------------------------------------------------------------------
        | Drop primary key lama
        |--------------------------------------------------------------------------
        */
        DB::statement('ALTER TABLE penjualan_items DROP CONSTRAINT IF EXISTS penjualan_items_pkey');
        DB::statement('ALTER TABLE pembelian_items DROP CONSTRAINT IF EXISTS pembelian_items_pkey');
        DB::statement('ALTER TABLE data_barangs DROP CONSTRAINT IF EXISTS data_barangs_pkey');
        DB::statement('ALTER TABLE kategori_barangs DROP CONSTRAINT IF EXISTS kategori_barangs_pkey');

        /*
        |--------------------------------------------------------------------------
        | Drop kolom lama
        |--------------------------------------------------------------------------
        */
        DB::statement('ALTER TABLE penjualan_items DROP COLUMN IF EXISTS data_barang_id');
        DB::statement('ALTER TABLE pembelian_items DROP COLUMN IF EXISTS data_barang_id');

        DB::statement('ALTER TABLE data_barangs DROP COLUMN IF EXISTS kategori_id');
        DB::statement('ALTER TABLE data_barangs DROP COLUMN IF EXISTS id');
        DB::statement('ALTER TABLE kategori_barangs DROP COLUMN IF EXISTS id');

        /*
        |--------------------------------------------------------------------------
        | Rename kolom temp menjadi kolom asli
        |--------------------------------------------------------------------------
        */
        DB::statement('ALTER TABLE kategori_barangs RENAME COLUMN uuid_temp TO id');
        DB::statement('ALTER TABLE data_barangs RENAME COLUMN uuid_temp TO id');
        DB::statement('ALTER TABLE data_barangs RENAME COLUMN kategori_uuid_temp TO kategori_id');

        DB::statement('ALTER TABLE penjualan_items RENAME COLUMN data_barang_uuid_temp TO data_barang_id');
        DB::statement('ALTER TABLE pembelian_items RENAME COLUMN data_barang_uuid_temp TO data_barang_id');

        /*
        |--------------------------------------------------------------------------
        | Set not null
        |--------------------------------------------------------------------------
        */
        DB::statement('ALTER TABLE kategori_barangs ALTER COLUMN id SET NOT NULL');
        DB::statement('ALTER TABLE data_barangs ALTER COLUMN id SET NOT NULL');
        DB::statement('ALTER TABLE data_barangs ALTER COLUMN kategori_id SET NOT NULL');

        DB::statement('ALTER TABLE penjualan_items ALTER COLUMN data_barang_id SET NOT NULL');
        DB::statement('ALTER TABLE pembelian_items ALTER COLUMN data_barang_id SET NOT NULL');

        /*
        |--------------------------------------------------------------------------
        | Buat primary key ulang
        |--------------------------------------------------------------------------
        */
        DB::statement('ALTER TABLE kategori_barangs ADD PRIMARY KEY (id)');
        DB::statement('ALTER TABLE data_barangs ADD PRIMARY KEY (id)');

        /*
        |--------------------------------------------------------------------------
        | Buat foreign key ulang
        |--------------------------------------------------------------------------
        */
        DB::statement("
            ALTER TABLE data_barangs
            ADD CONSTRAINT data_barangs_kategori_id_foreign
            FOREIGN KEY (kategori_id)
            REFERENCES kategori_barangs(id)
            ON DELETE CASCADE
        ");

        DB::statement("
            ALTER TABLE penjualan_items
            ADD CONSTRAINT penjualan_items_data_barang_id_foreign
            FOREIGN KEY (data_barang_id)
            REFERENCES data_barangs(id)
            ON DELETE CASCADE
        ");

        DB::statement("
            ALTER TABLE pembelian_items
            ADD CONSTRAINT pembelian_items_data_barang_id_foreign
            FOREIGN KEY (data_barang_id)
            REFERENCES data_barangs(id)
            ON DELETE CASCADE
        ");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE penjualan_items DROP CONSTRAINT IF EXISTS penjualan_items_data_barang_id_foreign');
        DB::statement('ALTER TABLE pembelian_items DROP CONSTRAINT IF EXISTS pembelian_items_data_barang_id_foreign');
        DB::statement('ALTER TABLE data_barangs DROP CONSTRAINT IF EXISTS data_barangs_kategori_id_foreign');

        DB::statement('ALTER TABLE data_barangs DROP CONSTRAINT IF EXISTS data_barangs_pkey');
        DB::statement('ALTER TABLE kategori_barangs DROP CONSTRAINT IF EXISTS kategori_barangs_pkey');

        DB::statement('ALTER TABLE kategori_barangs ADD COLUMN IF NOT EXISTS bigint_temp bigserial');
        DB::statement('ALTER TABLE data_barangs ADD COLUMN IF NOT EXISTS bigint_temp bigserial');
        DB::statement('ALTER TABLE data_barangs ADD COLUMN IF NOT EXISTS kategori_bigint_temp bigint');

        DB::statement('ALTER TABLE penjualan_items ADD COLUMN IF NOT EXISTS data_barang_bigint_temp bigint');
        DB::statement('ALTER TABLE pembelian_items ADD COLUMN IF NOT EXISTS data_barang_bigint_temp bigint');

        DB::statement("
            UPDATE data_barangs
            SET kategori_bigint_temp = kategori_barangs.bigint_temp
            FROM kategori_barangs
            WHERE data_barangs.kategori_id = kategori_barangs.id
        ");

        DB::statement("
            UPDATE penjualan_items
            SET data_barang_bigint_temp = data_barangs.bigint_temp
            FROM data_barangs
            WHERE penjualan_items.data_barang_id = data_barangs.id
        ");

        DB::statement("
            UPDATE pembelian_items
            SET data_barang_bigint_temp = data_barangs.bigint_temp
            FROM data_barangs
            WHERE pembelian_items.data_barang_id = data_barangs.id
        ");

        DB::statement('ALTER TABLE penjualan_items DROP COLUMN IF EXISTS data_barang_id');
        DB::statement('ALTER TABLE pembelian_items DROP COLUMN IF EXISTS data_barang_id');

        DB::statement('ALTER TABLE data_barangs DROP COLUMN IF EXISTS kategori_id');
        DB::statement('ALTER TABLE data_barangs DROP COLUMN IF EXISTS id');
        DB::statement('ALTER TABLE kategori_barangs DROP COLUMN IF EXISTS id');

        DB::statement('ALTER TABLE kategori_barangs RENAME COLUMN bigint_temp TO id');
        DB::statement('ALTER TABLE data_barangs RENAME COLUMN bigint_temp TO id');
        DB::statement('ALTER TABLE data_barangs RENAME COLUMN kategori_bigint_temp TO kategori_id');

        DB::statement('ALTER TABLE penjualan_items RENAME COLUMN data_barang_bigint_temp TO data_barang_id');
        DB::statement('ALTER TABLE pembelian_items RENAME COLUMN data_barang_bigint_temp TO data_barang_id');

        DB::statement('ALTER TABLE kategori_barangs ALTER COLUMN id SET NOT NULL');
        DB::statement('ALTER TABLE data_barangs ALTER COLUMN id SET NOT NULL');
        DB::statement('ALTER TABLE data_barangs ALTER COLUMN kategori_id SET NOT NULL');

        DB::statement('ALTER TABLE penjualan_items ALTER COLUMN data_barang_id SET NOT NULL');
        DB::statement('ALTER TABLE pembelian_items ALTER COLUMN data_barang_id SET NOT NULL');

        DB::statement('ALTER TABLE kategori_barangs ADD PRIMARY KEY (id)');
        DB::statement('ALTER TABLE data_barangs ADD PRIMARY KEY (id)');

        DB::statement("
            ALTER TABLE data_barangs
            ADD CONSTRAINT data_barangs_kategori_id_foreign
            FOREIGN KEY (kategori_id)
            REFERENCES kategori_barangs(id)
            ON DELETE CASCADE
        ");

        DB::statement("
            ALTER TABLE penjualan_items
            ADD CONSTRAINT penjualan_items_data_barang_id_foreign
            FOREIGN KEY (data_barang_id)
            REFERENCES data_barangs(id)
            ON DELETE CASCADE
        ");

        DB::statement("
            ALTER TABLE pembelian_items
            ADD CONSTRAINT pembelian_items_data_barang_id_foreign
            FOREIGN KEY (data_barang_id)
            REFERENCES data_barangs(id)
            ON DELETE CASCADE
        ");
    }
};
