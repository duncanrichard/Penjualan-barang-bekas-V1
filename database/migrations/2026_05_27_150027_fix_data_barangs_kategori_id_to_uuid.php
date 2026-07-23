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
        | Drop foreign key lama jika ada
        |--------------------------------------------------------------------------
        */
        DB::statement("
            DO $$
            DECLARE
                constraint_name text;
            BEGIN
                FOR constraint_name IN
                    SELECT conname
                    FROM pg_constraint
                    WHERE conrelid = 'data_barangs'::regclass
                    AND contype = 'f'
                LOOP
                    EXECUTE 'ALTER TABLE data_barangs DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
                END LOOP;
            END $$;
        ");

        /*
        |--------------------------------------------------------------------------
        | Tambah kolom temporary UUID
        |--------------------------------------------------------------------------
        */
        DB::statement("
            ALTER TABLE data_barangs
            ADD COLUMN IF NOT EXISTS kategori_id_uuid_temp uuid
        ");

        /*
        |--------------------------------------------------------------------------
        | Isi kategori_id_uuid_temp
        |
        | Catatan:
        | Karena kategori_id lama bertipe integer dan kategori_barangs.id sudah UUID,
        | nilai lama tidak bisa dipetakan langsung.
        | Kalau data_barangs sudah ada, sementara akan diarahkan ke kategori pertama.
        |--------------------------------------------------------------------------
        */
        DB::statement("
            UPDATE data_barangs
            SET kategori_id_uuid_temp = (
                SELECT id
                FROM kategori_barangs
                ORDER BY created_at ASC NULLS LAST, id ASC
                LIMIT 1
            )
            WHERE kategori_id_uuid_temp IS NULL
        ");

        /*
        |--------------------------------------------------------------------------
        | Drop kolom kategori_id lama
        |--------------------------------------------------------------------------
        */
        DB::statement("
            ALTER TABLE data_barangs
            DROP COLUMN IF EXISTS kategori_id
        ");

        /*
        |--------------------------------------------------------------------------
        | Rename kolom temporary jadi kategori_id
        |--------------------------------------------------------------------------
        */
        DB::statement("
            ALTER TABLE data_barangs
            RENAME COLUMN kategori_id_uuid_temp TO kategori_id
        ");

        /*
        |--------------------------------------------------------------------------
        | Set NOT NULL jika memang semua data sudah punya kategori
        |--------------------------------------------------------------------------
        */
        DB::statement("
            ALTER TABLE data_barangs
            ALTER COLUMN kategori_id SET NOT NULL
        ");

        /*
        |--------------------------------------------------------------------------
        | Buat ulang foreign key
        |--------------------------------------------------------------------------
        */
        DB::statement("
            ALTER TABLE data_barangs
            ADD CONSTRAINT data_barangs_kategori_id_foreign
            FOREIGN KEY (kategori_id)
            REFERENCES kategori_barangs(id)
            ON DELETE CASCADE
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE data_barangs
            DROP CONSTRAINT IF EXISTS data_barangs_kategori_id_foreign
        ");

        DB::statement("
            ALTER TABLE data_barangs
            DROP COLUMN IF EXISTS kategori_id
        ");

        DB::statement("
            ALTER TABLE data_barangs
            ADD COLUMN kategori_id bigint
        ");
    }
};
