<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        $parentTable = 'komponen_gajis';
        $parentColumn = 'id';

        if (!Schema::hasTable($parentTable)) {
            throw new \RuntimeException(
                "Tabel {$parentTable} tidak ditemukan."
            );
        }

        if (!Schema::hasColumn($parentTable, $parentColumn)) {
            throw new \RuntimeException(
                "Kolom {$parentTable}.{$parentColumn} tidak ditemukan."
            );
        }

        /*
         * Tidak perlu diproses lagi jika id sudah UUID.
         */
        if (
            $this->columnType(
                $parentTable,
                $parentColumn
            ) === 'uuid'
        ) {
            return;
        }

        DB::transaction(function () use (
            $parentTable,
            $parentColumn
        ): void {
            /*
             * Tambahkan UUID sementara pada komponen_gajis.
             */
            DB::statement(
                sprintf(
                    '
                        ALTER TABLE %s
                        ADD COLUMN IF NOT EXISTS id_uuid UUID NULL
                    ',
                    $this->quoteIdentifier($parentTable)
                )
            );

            /*
             * Isi UUID untuk seluruh data lama.
             */
            DB::table($parentTable)
                ->select([
                    $parentColumn,
                    'id_uuid',
                ])
                ->orderBy($parentColumn)
                ->get()
                ->each(
                    function (object $row) use (
                        $parentTable,
                        $parentColumn
                    ): void {
                        if ($row->id_uuid !== null) {
                            return;
                        }

                        DB::table($parentTable)
                            ->where(
                                $parentColumn,
                                $row->{$parentColumn}
                            )
                            ->update([
                                'id_uuid' =>
                                    (string) Str::uuid(),
                            ]);
                    }
                );

            $missingUuidCount = DB::table($parentTable)
                ->whereNull('id_uuid')
                ->count();

            if ($missingUuidCount > 0) {
                throw new \RuntimeException(
                    "Masih ada {$missingUuidCount} data "
                    . "{$parentTable} yang belum memiliki UUID."
                );
            }

            DB::statement(
                sprintf(
                    '
                        ALTER TABLE %s
                        ALTER COLUMN id_uuid SET NOT NULL
                    ',
                    $this->quoteIdentifier($parentTable)
                )
            );

            /*
             * Cari seluruh foreign key yang mengarah ke komponen_gajis.id.
             *
             * Termasuk:
             * komponen_gaji_karyawans.komponen_gaji_id
             */
            $references =
                $this->getReferencingForeignKeys(
                    $parentTable,
                    $parentColumn
                );

            /*
             * Ubah seluruh foreign key bigint menjadi UUID.
             */
            foreach ($references as $reference) {
                $this->convertReferencingColumn(
                    $reference,
                    $parentTable,
                    $parentColumn
                );
            }

            /*
             * Hapus primary key bigint lama.
             */
            $this->dropPrimaryKey($parentTable);

            /*
             * Hapus default sequence dari id lama.
             */
            DB::statement(
                sprintf(
                    '
                        ALTER TABLE %s
                        ALTER COLUMN %s DROP DEFAULT
                    ',
                    $this->quoteIdentifier($parentTable),
                    $this->quoteIdentifier($parentColumn)
                )
            );

            /*
             * Hapus kolom bigint lama.
             */
            DB::statement(
                sprintf(
                    '
                        ALTER TABLE %s
                        DROP COLUMN %s
                    ',
                    $this->quoteIdentifier($parentTable),
                    $this->quoteIdentifier($parentColumn)
                )
            );

            /*
             * Rename id_uuid menjadi id.
             */
            DB::statement(
                sprintf(
                    '
                        ALTER TABLE %s
                        RENAME COLUMN id_uuid TO %s
                    ',
                    $this->quoteIdentifier($parentTable),
                    $this->quoteIdentifier($parentColumn)
                )
            );

            /*
             * Buat primary key UUID.
             */
            DB::statement(
                sprintf(
                    '
                        ALTER TABLE %s
                        ADD CONSTRAINT %s
                        PRIMARY KEY (%s)
                    ',
                    $this->quoteIdentifier($parentTable),
                    $this->quoteIdentifier(
                        'komponen_gajis_pkey'
                    ),
                    $this->quoteIdentifier($parentColumn)
                )
            );

            /*
             * Buat ulang seluruh foreign key.
             */
            foreach ($references as $reference) {
                $this->recreateForeignKey(
                    $reference,
                    $parentTable,
                    $parentColumn
                );
            }

            /*
             * Hapus sequence bigserial lama.
             */
            DB::statement(
                '
                    DROP SEQUENCE IF EXISTS
                    komponen_gajis_id_seq
                '
            );
        });
    }

    public function down(): void
    {
        throw new \RuntimeException(
            'Rollback UUID ke bigint tidak disediakan karena '
            . 'dapat mengubah identitas data dan merusak relasi.'
        );
    }

    /**
     * Mengubah kolom foreign key bigint menjadi UUID.
     */
    private function convertReferencingColumn(
        object $reference,
        string $parentTable,
        string $parentColumn
    ): void {
        $childTable =
            (string) $reference->table_name;

        $childColumn =
            (string) $reference->column_name;

        $constraintName =
            (string) $reference->constraint_name;

        if (
            !Schema::hasTable($childTable)
            || !Schema::hasColumn(
                $childTable,
                $childColumn
            )
        ) {
            throw new \RuntimeException(
                "Kolom relasi tidak ditemukan: "
                . "{$childTable}.{$childColumn}"
            );
        }

        /*
         * Lewati bila kolom sudah UUID.
         */
        if (
            $this->columnType(
                $childTable,
                $childColumn
            ) === 'uuid'
        ) {
            return;
        }

        $temporaryColumn =
            $childColumn . '_uuid';

        $isNullable =
            $this->columnIsNullable(
                $childTable,
                $childColumn
            );

        /*
         * Tambahkan kolom UUID sementara pada tabel anak.
         */
        DB::statement(
            sprintf(
                '
                    ALTER TABLE %s
                    ADD COLUMN IF NOT EXISTS %s UUID NULL
                ',
                $this->quoteIdentifier($childTable),
                $this->quoteIdentifier(
                    $temporaryColumn
                )
            )
        );

        /*
         * Pindahkan hubungan bigint ke UUID.
         */
        DB::statement(
            sprintf(
                '
                    UPDATE %1$s AS child
                    SET %2$s = parent.id_uuid
                    FROM %3$s AS parent
                    WHERE child.%4$s = parent.%5$s
                      AND child.%4$s IS NOT NULL
                      AND child.%2$s IS NULL
                ',
                $this->quoteIdentifier($childTable),
                $this->quoteIdentifier(
                    $temporaryColumn
                ),
                $this->quoteIdentifier($parentTable),
                $this->quoteIdentifier($childColumn),
                $this->quoteIdentifier($parentColumn)
            )
        );

        /*
         * Periksa data foreign key yang gagal dipetakan.
         */
        $invalidCount = DB::table($childTable)
            ->whereNotNull($childColumn)
            ->whereNull($temporaryColumn)
            ->count();

        if ($invalidCount > 0) {
            throw new \RuntimeException(
                "Ada {$invalidCount} data pada "
                . "{$childTable}.{$childColumn} yang gagal "
                . 'dipetakan ke UUID.'
            );
        }

        /*
         * Pertahankan NOT NULL bila kolom lama wajib diisi.
         */
        if (!$isNullable) {
            $nullCount = DB::table($childTable)
                ->whereNull($temporaryColumn)
                ->count();

            if ($nullCount > 0) {
                throw new \RuntimeException(
                    "Kolom {$childTable}.{$childColumn} "
                    . "wajib diisi, tetapi terdapat {$nullCount} "
                    . 'data tanpa relasi.'
                );
            }

            DB::statement(
                sprintf(
                    '
                        ALTER TABLE %s
                        ALTER COLUMN %s SET NOT NULL
                    ',
                    $this->quoteIdentifier($childTable),
                    $this->quoteIdentifier(
                        $temporaryColumn
                    )
                )
            );
        }

        /*
         * Hapus foreign key lama.
         */
        DB::statement(
            sprintf(
                '
                    ALTER TABLE %s
                    DROP CONSTRAINT IF EXISTS %s
                ',
                $this->quoteIdentifier($childTable),
                $this->quoteIdentifier(
                    $constraintName
                )
            )
        );

        /*
         * Hapus index lama yang hanya menggunakan kolom bigint.
         */
        $this->dropSingleColumnIndexes(
            $childTable,
            $childColumn
        );

        /*
         * Hapus kolom bigint lama.
         */
        DB::statement(
            sprintf(
                '
                    ALTER TABLE %s
                    DROP COLUMN %s
                ',
                $this->quoteIdentifier($childTable),
                $this->quoteIdentifier($childColumn)
            )
        );

        /*
         * Rename UUID sementara ke nama kolom semula.
         */
        DB::statement(
            sprintf(
                '
                    ALTER TABLE %s
                    RENAME COLUMN %s TO %s
                ',
                $this->quoteIdentifier($childTable),
                $this->quoteIdentifier(
                    $temporaryColumn
                ),
                $this->quoteIdentifier($childColumn)
            )
        );

        /*
         * Buat index UUID.
         */
        $indexName =
            $childTable
            . '_'
            . $childColumn
            . '_index';

        DB::statement(
            sprintf(
                '
                    CREATE INDEX IF NOT EXISTS %s
                    ON %s (%s)
                ',
                $this->quoteIdentifier($indexName),
                $this->quoteIdentifier($childTable),
                $this->quoteIdentifier($childColumn)
            )
        );
    }

    /**
     * Membuat kembali foreign key setelah tipe data menjadi UUID.
     */
    private function recreateForeignKey(
        object $reference,
        string $parentTable,
        string $parentColumn
    ): void {
        $childTable =
            (string) $reference->table_name;

        $childColumn =
            (string) $reference->column_name;

        $constraintName =
            (string) $reference->constraint_name;

        if (
            !Schema::hasTable($childTable)
            || !Schema::hasColumn(
                $childTable,
                $childColumn
            )
        ) {
            return;
        }

        DB::statement(
            sprintf(
                '
                    ALTER TABLE %s
                    DROP CONSTRAINT IF EXISTS %s
                ',
                $this->quoteIdentifier($childTable),
                $this->quoteIdentifier(
                    $constraintName
                )
            )
        );

        $onUpdate =
            $this->normalizeForeignKeyAction(
                (string) $reference->update_rule
            );

        $onDelete =
            $this->normalizeForeignKeyAction(
                (string) $reference->delete_rule
            );

        DB::statement(
            sprintf(
                '
                    ALTER TABLE %1$s
                    ADD CONSTRAINT %2$s
                    FOREIGN KEY (%3$s)
                    REFERENCES %4$s (%5$s)
                    ON UPDATE %6$s
                    ON DELETE %7$s
                ',
                $this->quoteIdentifier($childTable),
                $this->quoteIdentifier(
                    $constraintName
                ),
                $this->quoteIdentifier($childColumn),
                $this->quoteIdentifier($parentTable),
                $this->quoteIdentifier($parentColumn),
                $onUpdate,
                $onDelete
            )
        );
    }

    /**
     * Mengambil semua foreign key yang mengarah
     * ke tabel dan kolom parent.
     */
    private function getReferencingForeignKeys(
        string $parentTable,
        string $parentColumn
    ): array {
        return DB::select(
            '
                SELECT
                    tc.table_name,
                    kcu.column_name,
                    tc.constraint_name,
                    rc.update_rule,
                    rc.delete_rule
                FROM information_schema.table_constraints AS tc
                INNER JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name =
                        kcu.constraint_name
                   AND tc.constraint_schema =
                        kcu.constraint_schema
                INNER JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name =
                        tc.constraint_name
                   AND ccu.constraint_schema =
                        tc.constraint_schema
                INNER JOIN information_schema.referential_constraints AS rc
                    ON rc.constraint_name =
                        tc.constraint_name
                   AND rc.constraint_schema =
                        tc.constraint_schema
                WHERE tc.constraint_type = \'FOREIGN KEY\'
                  AND tc.table_schema = current_schema()
                  AND ccu.table_schema = current_schema()
                  AND ccu.table_name = ?
                  AND ccu.column_name = ?
                ORDER BY
                    tc.table_name,
                    kcu.column_name
            ',
            [
                $parentTable,
                $parentColumn,
            ]
        );
    }

    /**
     * Mengambil tipe data kolom PostgreSQL.
     */
    private function columnType(
        string $table,
        string $column
    ): ?string {
        $result = DB::selectOne(
            '
                SELECT
                    data_type,
                    udt_name
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = ?
                  AND column_name = ?
                LIMIT 1
            ',
            [
                $table,
                $column,
            ]
        );

        if (!$result) {
            return null;
        }

        return $result->udt_name
            ?: $result->data_type;
    }

    /**
     * Memeriksa nullable kolom.
     */
    private function columnIsNullable(
        string $table,
        string $column
    ): bool {
        $result = DB::selectOne(
            '
                SELECT is_nullable
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = ?
                  AND column_name = ?
                LIMIT 1
            ',
            [
                $table,
                $column,
            ]
        );

        return !$result
            || strtoupper(
                (string) $result->is_nullable
            ) === 'YES';
    }

    /**
     * Menghapus primary key tabel.
     */
    private function dropPrimaryKey(
        string $table
    ): void {
        $constraints = DB::select(
            '
                SELECT constraint_name
                FROM information_schema.table_constraints
                WHERE constraint_type = \'PRIMARY KEY\'
                  AND table_schema = current_schema()
                  AND table_name = ?
            ',
            [
                $table,
            ]
        );

        foreach ($constraints as $constraint) {
            DB::statement(
                sprintf(
                    '
                        ALTER TABLE %s
                        DROP CONSTRAINT IF EXISTS %s
                    ',
                    $this->quoteIdentifier($table),
                    $this->quoteIdentifier(
                        (string) $constraint
                            ->constraint_name
                    )
                )
            );
        }
    }

    /**
     * Menghapus index biasa yang hanya memakai satu kolom.
     */
    private function dropSingleColumnIndexes(
        string $table,
        string $column
    ): void {
        $indexes = DB::select(
            '
                SELECT
                    indexname,
                    indexdef
                FROM pg_indexes
                WHERE schemaname = current_schema()
                  AND tablename = ?
            ',
            [
                $table,
            ]
        );

        foreach ($indexes as $index) {
            $indexName =
                (string) $index->indexname;

            $indexDefinition =
                (string) $index->indexdef;

            $lowerDefinition =
                strtolower($indexDefinition);

            /*
             * Jangan menghapus primary key atau unique index.
             */
            if (
                str_contains(
                    $lowerDefinition,
                    ' unique '
                )
                || str_contains(
                    strtolower($indexName),
                    'pkey'
                )
            ) {
                continue;
            }

            $pattern = sprintf(
                '/\(\s*"?%s"?\s*\)$/i',
                preg_quote($column, '/')
            );

            if (
                !preg_match(
                    $pattern,
                    $indexDefinition
                )
            ) {
                continue;
            }

            DB::statement(
                sprintf(
                    'DROP INDEX IF EXISTS %s',
                    $this->quoteIdentifier(
                        $indexName
                    )
                )
            );
        }
    }

    /**
     * Menormalkan aturan foreign key PostgreSQL.
     */
    private function normalizeForeignKeyAction(
        string $action
    ): string {
        return match (
            strtoupper(trim($action))
        ) {
            'CASCADE' => 'CASCADE',
            'SET NULL' => 'SET NULL',
            'SET DEFAULT' => 'SET DEFAULT',
            'RESTRICT' => 'RESTRICT',
            'NO ACTION' => 'NO ACTION',
            default => 'NO ACTION',
        };
    }

    /**
     * Mengamankan nama tabel, kolom, index, dan constraint.
     */
    private function quoteIdentifier(
        string $identifier
    ): string {
        return '"'
            . str_replace(
                '"',
                '""',
                $identifier
            )
            . '"';
    }
};
