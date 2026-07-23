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
        | Tambah kolom UUID sementara
        |--------------------------------------------------------------------------
        */
        DB::statement('ALTER TABLE setting_jam_kerjas ADD COLUMN IF NOT EXISTS uuid_temp uuid');
        DB::statement('ALTER TABLE kategori_penggajians ADD COLUMN IF NOT EXISTS uuid_temp uuid');

        DB::statement('ALTER TABLE pembelians ADD COLUMN IF NOT EXISTS uuid_temp uuid');
        DB::statement('ALTER TABLE pembelian_items ADD COLUMN IF NOT EXISTS uuid_temp uuid');
        DB::statement('ALTER TABLE pembelian_items ADD COLUMN IF NOT EXISTS pembelian_uuid_temp uuid');

        DB::statement('ALTER TABLE penjualans ADD COLUMN IF NOT EXISTS uuid_temp uuid');
        DB::statement('ALTER TABLE penjualan_items ADD COLUMN IF NOT EXISTS uuid_temp uuid');
        DB::statement('ALTER TABLE penjualan_items ADD COLUMN IF NOT EXISTS penjualan_uuid_temp uuid');

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    ALTER TABLE penggajian_karyawans ADD COLUMN IF NOT EXISTS uuid_temp uuid;
                    ALTER TABLE penggajian_karyawans ADD COLUMN IF NOT EXISTS kategori_penggajian_uuid_temp uuid;
                END IF;
            END $$;
        ");

        /*
        |--------------------------------------------------------------------------
        | Isi UUID sementara
        |--------------------------------------------------------------------------
        */
        DB::statement('UPDATE setting_jam_kerjas SET uuid_temp = COALESCE(uuid_temp, gen_random_uuid())');
        DB::statement('UPDATE kategori_penggajians SET uuid_temp = COALESCE(uuid_temp, gen_random_uuid())');

        DB::statement('UPDATE pembelians SET uuid_temp = COALESCE(uuid_temp, gen_random_uuid())');
        DB::statement('UPDATE pembelian_items SET uuid_temp = COALESCE(uuid_temp, gen_random_uuid())');

        DB::statement('UPDATE penjualans SET uuid_temp = COALESCE(uuid_temp, gen_random_uuid())');
        DB::statement('UPDATE penjualan_items SET uuid_temp = COALESCE(uuid_temp, gen_random_uuid())');

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    UPDATE penggajian_karyawans
                    SET uuid_temp = COALESCE(uuid_temp, gen_random_uuid());
                END IF;
            END $$;
        ");

        /*
        |--------------------------------------------------------------------------
        | Mapping FK lama ke UUID baru
        |--------------------------------------------------------------------------
        */
        DB::statement("
            UPDATE pembelian_items
            SET pembelian_uuid_temp = pembelians.uuid_temp
            FROM pembelians
            WHERE pembelian_items.pembelian_id = pembelians.id
        ");

        DB::statement("
            UPDATE penjualan_items
            SET penjualan_uuid_temp = penjualans.uuid_temp
            FROM penjualans
            WHERE penjualan_items.penjualan_id = penjualans.id
        ");

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    UPDATE penggajian_karyawans
                    SET kategori_penggajian_uuid_temp = kategori_penggajians.uuid_temp
                    FROM kategori_penggajians
                    WHERE penggajian_karyawans.kategori_penggajian_id = kategori_penggajians.id;
                END IF;
            END $$;
        ");

        /*
        |--------------------------------------------------------------------------
        | Drop semua foreign key yang berhubungan
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
                    WHERE conrelid = 'pembelian_items'::regclass
                    AND contype = 'f'
                LOOP
                    EXECUTE 'ALTER TABLE pembelian_items DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
                END LOOP;
            END $$;
        ");

        DB::statement("
            DO $$
            DECLARE
                constraint_name text;
            BEGIN
                FOR constraint_name IN
                    SELECT conname
                    FROM pg_constraint
                    WHERE conrelid = 'penjualan_items'::regclass
                    AND contype = 'f'
                LOOP
                    EXECUTE 'ALTER TABLE penjualan_items DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
                END LOOP;
            END $$;
        ");

        DB::statement("
            DO $$
            DECLARE
                constraint_name text;
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    FOR constraint_name IN
                        SELECT conname
                        FROM pg_constraint
                        WHERE conrelid = 'penggajian_karyawans'::regclass
                        AND contype = 'f'
                    LOOP
                        EXECUTE 'ALTER TABLE penggajian_karyawans DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
                    END LOOP;
                END IF;
            END $$;
        ");

        /*
        |--------------------------------------------------------------------------
        | Drop primary key lama
        |--------------------------------------------------------------------------
        */
        DB::statement('ALTER TABLE setting_jam_kerjas DROP CONSTRAINT IF EXISTS setting_jam_kerjas_pkey');
        DB::statement('ALTER TABLE kategori_penggajians DROP CONSTRAINT IF EXISTS kategori_penggajians_pkey');

        DB::statement('ALTER TABLE pembelian_items DROP CONSTRAINT IF EXISTS pembelian_items_pkey');
        DB::statement('ALTER TABLE pembelians DROP CONSTRAINT IF EXISTS pembelians_pkey');

        DB::statement('ALTER TABLE penjualan_items DROP CONSTRAINT IF EXISTS penjualan_items_pkey');
        DB::statement('ALTER TABLE penjualans DROP CONSTRAINT IF EXISTS penjualans_pkey');

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    ALTER TABLE penggajian_karyawans DROP CONSTRAINT IF EXISTS penggajian_karyawans_pkey;
                END IF;
            END $$;
        ");

        /*
        |--------------------------------------------------------------------------
        | Drop kolom lama
        |--------------------------------------------------------------------------
        */
        DB::statement('ALTER TABLE setting_jam_kerjas DROP COLUMN IF EXISTS id');
        DB::statement('ALTER TABLE kategori_penggajians DROP COLUMN IF EXISTS id');

        DB::statement('ALTER TABLE pembelian_items DROP COLUMN IF EXISTS id');
        DB::statement('ALTER TABLE pembelian_items DROP COLUMN IF EXISTS pembelian_id');
        DB::statement('ALTER TABLE pembelians DROP COLUMN IF EXISTS id');

        DB::statement('ALTER TABLE penjualan_items DROP COLUMN IF EXISTS id');
        DB::statement('ALTER TABLE penjualan_items DROP COLUMN IF EXISTS penjualan_id');
        DB::statement('ALTER TABLE penjualans DROP COLUMN IF EXISTS id');

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    ALTER TABLE penggajian_karyawans DROP COLUMN IF EXISTS id;
                    ALTER TABLE penggajian_karyawans DROP COLUMN IF EXISTS kategori_penggajian_id;
                END IF;
            END $$;
        ");

        /*
        |--------------------------------------------------------------------------
        | Rename kolom UUID sementara menjadi kolom asli
        |--------------------------------------------------------------------------
        */
        DB::statement('ALTER TABLE setting_jam_kerjas RENAME COLUMN uuid_temp TO id');
        DB::statement('ALTER TABLE kategori_penggajians RENAME COLUMN uuid_temp TO id');

        DB::statement('ALTER TABLE pembelians RENAME COLUMN uuid_temp TO id');
        DB::statement('ALTER TABLE pembelian_items RENAME COLUMN uuid_temp TO id');
        DB::statement('ALTER TABLE pembelian_items RENAME COLUMN pembelian_uuid_temp TO pembelian_id');

        DB::statement('ALTER TABLE penjualans RENAME COLUMN uuid_temp TO id');
        DB::statement('ALTER TABLE penjualan_items RENAME COLUMN uuid_temp TO id');
        DB::statement('ALTER TABLE penjualan_items RENAME COLUMN penjualan_uuid_temp TO penjualan_id');

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    ALTER TABLE penggajian_karyawans RENAME COLUMN uuid_temp TO id;
                    ALTER TABLE penggajian_karyawans RENAME COLUMN kategori_penggajian_uuid_temp TO kategori_penggajian_id;
                END IF;
            END $$;
        ");

        /*
        |--------------------------------------------------------------------------
        | Set NOT NULL dan DEFAULT UUID
        |--------------------------------------------------------------------------
        */
        DB::statement('ALTER TABLE setting_jam_kerjas ALTER COLUMN id SET NOT NULL');
        DB::statement('ALTER TABLE setting_jam_kerjas ALTER COLUMN id SET DEFAULT gen_random_uuid()');

        DB::statement('ALTER TABLE kategori_penggajians ALTER COLUMN id SET NOT NULL');
        DB::statement('ALTER TABLE kategori_penggajians ALTER COLUMN id SET DEFAULT gen_random_uuid()');

        DB::statement('ALTER TABLE pembelians ALTER COLUMN id SET NOT NULL');
        DB::statement('ALTER TABLE pembelians ALTER COLUMN id SET DEFAULT gen_random_uuid()');

        DB::statement('ALTER TABLE pembelian_items ALTER COLUMN id SET NOT NULL');
        DB::statement('ALTER TABLE pembelian_items ALTER COLUMN id SET DEFAULT gen_random_uuid()');
        DB::statement('ALTER TABLE pembelian_items ALTER COLUMN pembelian_id SET NOT NULL');

        DB::statement('ALTER TABLE penjualans ALTER COLUMN id SET NOT NULL');
        DB::statement('ALTER TABLE penjualans ALTER COLUMN id SET DEFAULT gen_random_uuid()');

        DB::statement('ALTER TABLE penjualan_items ALTER COLUMN id SET NOT NULL');
        DB::statement('ALTER TABLE penjualan_items ALTER COLUMN id SET DEFAULT gen_random_uuid()');
        DB::statement('ALTER TABLE penjualan_items ALTER COLUMN penjualan_id SET NOT NULL');

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    ALTER TABLE penggajian_karyawans ALTER COLUMN id SET NOT NULL;
                    ALTER TABLE penggajian_karyawans ALTER COLUMN id SET DEFAULT gen_random_uuid();
                    ALTER TABLE penggajian_karyawans ALTER COLUMN kategori_penggajian_id SET NOT NULL;
                END IF;
            END $$;
        ");

        /*
        |--------------------------------------------------------------------------
        | Buat primary key baru
        |--------------------------------------------------------------------------
        */
        DB::statement('ALTER TABLE setting_jam_kerjas ADD PRIMARY KEY (id)');
        DB::statement('ALTER TABLE kategori_penggajians ADD PRIMARY KEY (id)');

        DB::statement('ALTER TABLE pembelians ADD PRIMARY KEY (id)');
        DB::statement('ALTER TABLE pembelian_items ADD PRIMARY KEY (id)');

        DB::statement('ALTER TABLE penjualans ADD PRIMARY KEY (id)');
        DB::statement('ALTER TABLE penjualan_items ADD PRIMARY KEY (id)');

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    ALTER TABLE penggajian_karyawans ADD PRIMARY KEY (id);
                END IF;
            END $$;
        ");

        /*
        |--------------------------------------------------------------------------
        | Buat ulang foreign key
        |--------------------------------------------------------------------------
        */
        DB::statement("
            ALTER TABLE pembelian_items
            ADD CONSTRAINT pembelian_items_pembelian_id_foreign
            FOREIGN KEY (pembelian_id)
            REFERENCES pembelians(id)
            ON DELETE CASCADE
        ");

        DB::statement("
            ALTER TABLE penjualan_items
            ADD CONSTRAINT penjualan_items_penjualan_id_foreign
            FOREIGN KEY (penjualan_id)
            REFERENCES penjualans(id)
            ON DELETE CASCADE
        ");

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('data_barangs') IS NOT NULL THEN
                    ALTER TABLE pembelian_items
                    ADD CONSTRAINT pembelian_items_data_barang_id_foreign
                    FOREIGN KEY (data_barang_id)
                    REFERENCES data_barangs(id)
                    ON DELETE CASCADE;
                END IF;
            END $$;
        ");

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('data_barangs') IS NOT NULL THEN
                    ALTER TABLE penjualan_items
                    ADD CONSTRAINT penjualan_items_data_barang_id_foreign
                    FOREIGN KEY (data_barang_id)
                    REFERENCES data_barangs(id)
                    ON DELETE CASCADE;
                END IF;
            END $$;
        ");

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    ALTER TABLE penggajian_karyawans
                    ADD CONSTRAINT penggajian_karyawans_kategori_penggajian_id_foreign
                    FOREIGN KEY (kategori_penggajian_id)
                    REFERENCES kategori_penggajians(id)
                    ON DELETE CASCADE;
                END IF;
            END $$;
        ");

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL
                    AND to_regclass('data_karyawans') IS NOT NULL
                    AND EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_name = 'penggajian_karyawans'
                        AND column_name = 'data_karyawan_id'
                    )
                THEN
                    ALTER TABLE penggajian_karyawans
                    ADD CONSTRAINT penggajian_karyawans_data_karyawan_id_foreign
                    FOREIGN KEY (data_karyawan_id)
                    REFERENCES data_karyawans(id)
                    ON DELETE CASCADE;
                END IF;
            END $$;
        ");
    }

    public function down(): void
    {
        /*
        |--------------------------------------------------------------------------
        | Rollback UUID ke bigserial tidak dibuat otomatis karena berisiko
        | merusak data relasi. Jika butuh rollback, restore dari backup database.
        |--------------------------------------------------------------------------
        */
    }
};
