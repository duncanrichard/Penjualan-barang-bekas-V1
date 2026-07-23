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
        | Tambah kolom UUID temporary
        |--------------------------------------------------------------------------
        */
        DB::statement('ALTER TABLE data_karyawans ADD COLUMN IF NOT EXISTS uuid_temp uuid');
        DB::statement('ALTER TABLE absensi_karyawans ADD COLUMN IF NOT EXISTS uuid_temp uuid');
        DB::statement('ALTER TABLE absensi_karyawans ADD COLUMN IF NOT EXISTS karyawan_uuid_temp uuid');

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    ALTER TABLE penggajian_karyawans
                    ADD COLUMN IF NOT EXISTS data_karyawan_uuid_temp uuid;
                END IF;
            END $$;
        ");

        /*
        |--------------------------------------------------------------------------
        | Isi UUID temporary
        |--------------------------------------------------------------------------
        */
        DB::statement('UPDATE data_karyawans SET uuid_temp = COALESCE(uuid_temp, gen_random_uuid())');
        DB::statement('UPDATE absensi_karyawans SET uuid_temp = COALESCE(uuid_temp, gen_random_uuid())');

        /*
        |--------------------------------------------------------------------------
        | Mapping relasi absensi_karyawans.karyawan_id ke UUID data_karyawans.id
        |--------------------------------------------------------------------------
        */
        DB::statement("
            UPDATE absensi_karyawans
            SET karyawan_uuid_temp = data_karyawans.uuid_temp
            FROM data_karyawans
            WHERE absensi_karyawans.karyawan_id = data_karyawans.id
        ");

        /*
        |--------------------------------------------------------------------------
        | Mapping relasi penggajian_karyawans.data_karyawan_id jika tabelnya ada
        |--------------------------------------------------------------------------
        */
        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    UPDATE penggajian_karyawans
                    SET data_karyawan_uuid_temp = data_karyawans.uuid_temp
                    FROM data_karyawans
                    WHERE penggajian_karyawans.data_karyawan_id = data_karyawans.id;
                END IF;
            END $$;
        ");

        /*
        |--------------------------------------------------------------------------
        | Drop foreign key yang bergantung ke data_karyawans
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
                    WHERE conrelid = 'absensi_karyawans'::regclass
                    AND contype = 'f'
                LOOP
                    EXECUTE 'ALTER TABLE absensi_karyawans DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
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
        DB::statement('ALTER TABLE absensi_karyawans DROP CONSTRAINT IF EXISTS absensi_karyawans_pkey');
        DB::statement('ALTER TABLE data_karyawans DROP CONSTRAINT IF EXISTS data_karyawans_pkey');

        /*
        |--------------------------------------------------------------------------
        | Drop kolom lama
        |--------------------------------------------------------------------------
        */
        DB::statement('ALTER TABLE absensi_karyawans DROP COLUMN IF EXISTS id');
        DB::statement('ALTER TABLE absensi_karyawans DROP COLUMN IF EXISTS karyawan_id');
        DB::statement('ALTER TABLE data_karyawans DROP COLUMN IF EXISTS id');

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    ALTER TABLE penggajian_karyawans DROP COLUMN IF EXISTS data_karyawan_id;
                END IF;
            END $$;
        ");

        /*
        |--------------------------------------------------------------------------
        | Rename kolom temporary menjadi kolom asli
        |--------------------------------------------------------------------------
        */
        DB::statement('ALTER TABLE data_karyawans RENAME COLUMN uuid_temp TO id');
        DB::statement('ALTER TABLE absensi_karyawans RENAME COLUMN uuid_temp TO id');
        DB::statement('ALTER TABLE absensi_karyawans RENAME COLUMN karyawan_uuid_temp TO karyawan_id');

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    ALTER TABLE penggajian_karyawans
                    RENAME COLUMN data_karyawan_uuid_temp TO data_karyawan_id;
                END IF;
            END $$;
        ");

        /*
        |--------------------------------------------------------------------------
        | Set NOT NULL
        |--------------------------------------------------------------------------
        */
        DB::statement('ALTER TABLE data_karyawans ALTER COLUMN id SET NOT NULL');
        DB::statement('ALTER TABLE absensi_karyawans ALTER COLUMN id SET NOT NULL');
        DB::statement('ALTER TABLE absensi_karyawans ALTER COLUMN karyawan_id SET NOT NULL');

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    ALTER TABLE penggajian_karyawans
                    ALTER COLUMN data_karyawan_id SET NOT NULL;
                END IF;
            END $$;
        ");

        /*
        |--------------------------------------------------------------------------
        | Buat primary key ulang
        |--------------------------------------------------------------------------
        */
        DB::statement('ALTER TABLE data_karyawans ADD PRIMARY KEY (id)');
        DB::statement('ALTER TABLE absensi_karyawans ADD PRIMARY KEY (id)');

        /*
        |--------------------------------------------------------------------------
        | Buat foreign key ulang
        |--------------------------------------------------------------------------
        */
        DB::statement("
            ALTER TABLE absensi_karyawans
            ADD CONSTRAINT absensi_karyawans_karyawan_id_foreign
            FOREIGN KEY (karyawan_id)
            REFERENCES data_karyawans(id)
            ON DELETE CASCADE
        ");

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
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
        DB::statement('ALTER TABLE absensi_karyawans DROP CONSTRAINT IF EXISTS absensi_karyawans_karyawan_id_foreign');

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    ALTER TABLE penggajian_karyawans
                    DROP CONSTRAINT IF EXISTS penggajian_karyawans_data_karyawan_id_foreign;
                END IF;
            END $$;
        ");

        DB::statement('ALTER TABLE absensi_karyawans DROP CONSTRAINT IF EXISTS absensi_karyawans_pkey');
        DB::statement('ALTER TABLE data_karyawans DROP CONSTRAINT IF EXISTS data_karyawans_pkey');

        DB::statement('ALTER TABLE data_karyawans ADD COLUMN IF NOT EXISTS bigint_temp bigserial');
        DB::statement('ALTER TABLE absensi_karyawans ADD COLUMN IF NOT EXISTS bigint_temp bigserial');
        DB::statement('ALTER TABLE absensi_karyawans ADD COLUMN IF NOT EXISTS karyawan_bigint_temp bigint');

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    ALTER TABLE penggajian_karyawans
                    ADD COLUMN IF NOT EXISTS data_karyawan_bigint_temp bigint;
                END IF;
            END $$;
        ");

        DB::statement("
            UPDATE absensi_karyawans
            SET karyawan_bigint_temp = data_karyawans.bigint_temp
            FROM data_karyawans
            WHERE absensi_karyawans.karyawan_id = data_karyawans.id
        ");

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    UPDATE penggajian_karyawans
                    SET data_karyawan_bigint_temp = data_karyawans.bigint_temp
                    FROM data_karyawans
                    WHERE penggajian_karyawans.data_karyawan_id = data_karyawans.id;
                END IF;
            END $$;
        ");

        DB::statement('ALTER TABLE absensi_karyawans DROP COLUMN IF EXISTS id');
        DB::statement('ALTER TABLE absensi_karyawans DROP COLUMN IF EXISTS karyawan_id');
        DB::statement('ALTER TABLE data_karyawans DROP COLUMN IF EXISTS id');

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    ALTER TABLE penggajian_karyawans DROP COLUMN IF EXISTS data_karyawan_id;
                END IF;
            END $$;
        ");

        DB::statement('ALTER TABLE data_karyawans RENAME COLUMN bigint_temp TO id');
        DB::statement('ALTER TABLE absensi_karyawans RENAME COLUMN bigint_temp TO id');
        DB::statement('ALTER TABLE absensi_karyawans RENAME COLUMN karyawan_bigint_temp TO karyawan_id');

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    ALTER TABLE penggajian_karyawans
                    RENAME COLUMN data_karyawan_bigint_temp TO data_karyawan_id;
                END IF;
            END $$;
        ");

        DB::statement('ALTER TABLE data_karyawans ALTER COLUMN id SET NOT NULL');
        DB::statement('ALTER TABLE absensi_karyawans ALTER COLUMN id SET NOT NULL');
        DB::statement('ALTER TABLE absensi_karyawans ALTER COLUMN karyawan_id SET NOT NULL');

        DB::statement('ALTER TABLE data_karyawans ADD PRIMARY KEY (id)');
        DB::statement('ALTER TABLE absensi_karyawans ADD PRIMARY KEY (id)');

        DB::statement("
            ALTER TABLE absensi_karyawans
            ADD CONSTRAINT absensi_karyawans_karyawan_id_foreign
            FOREIGN KEY (karyawan_id)
            REFERENCES data_karyawans(id)
            ON DELETE CASCADE
        ");

        DB::statement("
            DO $$
            BEGIN
                IF to_regclass('penggajian_karyawans') IS NOT NULL THEN
                    ALTER TABLE penggajian_karyawans
                    ADD CONSTRAINT penggajian_karyawans_data_karyawan_id_foreign
                    FOREIGN KEY (data_karyawan_id)
                    REFERENCES data_karyawans(id)
                    ON DELETE CASCADE;
                END IF;
            END $$;
        ");
    }
};
