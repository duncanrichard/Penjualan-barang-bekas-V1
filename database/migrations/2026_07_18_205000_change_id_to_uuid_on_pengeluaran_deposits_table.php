<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        $tableName = 'pengeluaran_deposits';

        if (!Schema::hasTable($tableName)) {
            throw new \RuntimeException(
                "Tabel {$tableName} tidak ditemukan."
            );
        }

        if (!Schema::hasColumn($tableName, 'id')) {
            throw new \RuntimeException(
                "Kolom {$tableName}.id tidak ditemukan."
            );
        }

        /*
         * Jika id sudah uuid, hentikan.
         */
        if ($this->columnType($tableName, 'id') === 'uuid') {
            return;
        }

        DB::transaction(function () use ($tableName): void {
            /*
             * Tambahkan kolom UUID sementara.
             */
            DB::statement(
                sprintf(
                    '
                        ALTER TABLE %s
                        ADD COLUMN IF NOT EXISTS id_uuid UUID NULL
                    ',
                    $this->quoteIdentifier($tableName)
                )
            );

            /*
             * Isi UUID untuk seluruh data lama.
             */
            DB::table($tableName)
                ->select(['id', 'id_uuid'])
                ->orderBy('id')
                ->get()
                ->each(function (object $row) use ($tableName): void {
                    if ($row->id_uuid !== null) {
                        return;
                    }

                    DB::table($tableName)
                        ->where('id', $row->id)
                        ->update([
                            'id_uuid' => (string) Str::uuid(),
                        ]);
                });

            $missingUuidCount = DB::table($tableName)
                ->whereNull('id_uuid')
                ->count();

            if ($missingUuidCount > 0) {
                throw new \RuntimeException(
                    "Masih ada {$missingUuidCount} data "
                    . "{$tableName} yang belum memiliki UUID."
                );
            }

            DB::statement(
                sprintf(
                    '
                        ALTER TABLE %s
                        ALTER COLUMN id_uuid SET NOT NULL
                    ',
                    $this->quoteIdentifier($tableName)
                )
            );

            /*
             * Ambil semua foreign key dari tabel lain
             * yang mengarah ke pengeluaran_deposits.id.
             */
            $references = $this->getReferencingForeignKeys(
                $tableName,
                'id'
            );

            /*
             * Ubah seluruh foreign key bigint yang merujuk ke tabel ini menjadi UUID.
             */
            foreach ($references as $reference) {
                $this->convertReferencingColumn(
                    $reference,
                    $tableName
                );
            }

            /*
             * Hapus primary key lama.
             */
            $this->dropPrimaryKey($tableName);

            /*
             * Hapus default sequence dari kolom lama.
             */
            DB::statement(
                sprintf(
                    '
                        ALTER TABLE %s
                        ALTER COLUMN id DROP DEFAULT
                    ',
                    $this->quoteIdentifier($tableName)
                )
            );

            /*
             * Hapus kolom bigint lama.
             */
            DB::statement(
                sprintf(
                    '
                        ALTER TABLE %s
                        DROP COLUMN id
                    ',
                    $this->quoteIdentifier($tableName)
                )
            );

            /*
             * Rename id_uuid menjadi id.
             */
            DB::statement(
                sprintf(
                    '
                        ALTER TABLE %s
                        RENAME COLUMN id_uuid TO id
                    ',
                    $this->quoteIdentifier($tableName)
                )
            );

            /*
             * Buat primary key baru.
             */
            DB::statement(
                sprintf(
                    '
                        ALTER TABLE %s
                        ADD CONSTRAINT %s
                        PRIMARY KEY (id)
                    ',
                    $this->quoteIdentifier($tableName),
                    $this->quoteIdentifier('pengeluaran_deposits_pkey')
                )
            );

            /*
             * Buat ulang foreign key yang merujuk ke pengeluaran_deposits.id.
             */
            foreach ($references as $reference) {
                $this->recreateForeignKey(
                    $reference,
                    $tableName
                );
            }

            /*
             * Hapus sequence bigserial lama.
             */
            DB::statement(
                '
                    DROP SEQUENCE IF EXISTS
                    pengeluaran_deposits_id_seq
                '
            );
        });
    }

    public function down(): void
    {
        throw new \RuntimeException(
            'Rollback UUID ke bigint tidak disediakan karena dapat '
            . 'mengubah identitas data dan merusak relasi.'
        );
    }

    /**
     * Mengubah foreign key pada tabel anak dari bigint ke UUID.
     */
    private function convertReferencingColumn(
        object $reference,
        string $parentTable
    ): void {
        $childTable = (string) $reference->table_name;
        $childColumn = (string) $reference->column_name;
        $constraintName = (string) $reference->constraint_name;

        if (
            !Schema::hasTable($childTable)
            || !Schema::hasColumn($childTable, $childColumn)
        ) {
            throw new \RuntimeException(
                "Kolom relasi tidak ditemukan: {$childTable}.{$childColumn}"
            );
        }

        /*
         * Jika kolom anak sudah uuid, skip.
         */
        if ($this->columnType($childTable, $childColumn) === 'uuid') {
            return;
        }

        $temporaryColumn = $childColumn . '_uuid';

        $isNullable = $this->columnIsNullable(
            $childTable,
            $childColumn
        );

        DB::statement(
            sprintf(
                '
                    ALTER TABLE %s
                    ADD COLUMN IF NOT EXISTS %s UUID NULL
                ',
                $this->quoteIdentifier($childTable),
                $this->quoteIdentifier($temporaryColumn)
            )
        );

        DB::statement(
            sprintf(
                '
                    UPDATE %1$s AS child
                    SET %2$s = parent.id_uuid
                    FROM %3$s AS parent
                    WHERE child.%4$s = parent.id
                      AND child.%4$s IS NOT NULL
                      AND child.%2$s IS NULL
                ',
                $this->quoteIdentifier($childTable),
                $this->quoteIdentifier($temporaryColumn),
                $this->quoteIdentifier($parentTable),
                $this->quoteIdentifier($childColumn)
            )
        );

        $invalidCount = DB::table($childTable)
            ->whereNotNull($childColumn)
            ->whereNull($temporaryColumn)
            ->count();

        if ($invalidCount > 0) {
            throw new \RuntimeException(
                "Ada {$invalidCount} data pada {$childTable}.{$childColumn} "
                . 'yang gagal dipetakan ke UUID.'
            );
        }

        if (!$isNullable) {
            $nullCount = DB::table($childTable)
                ->whereNull($temporaryColumn)
                ->count();

            if ($nullCount > 0) {
                throw new \RuntimeException(
                    "Kolom {$childTable}.{$childColumn} wajib diisi, "
                    . "tetapi terdapat {$nullCount} data tanpa relasi."
                );
            }

            DB::statement(
                sprintf(
                    '
                        ALTER TABLE %s
                        ALTER COLUMN %s SET NOT NULL
                    ',
                    $this->quoteIdentifier($childTable),
                    $this->quoteIdentifier($temporaryColumn)
                )
            );
        }

        DB::statement(
            sprintf(
                '
                    ALTER TABLE %s
                    DROP CONSTRAINT IF EXISTS %s
                ',
                $this->quoteIdentifier($childTable),
                $this->quoteIdentifier($constraintName)
            )
        );

        $this->dropSingleColumnIndexes(
            $childTable,
            $childColumn
        );

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

        DB::statement(
            sprintf(
                '
                    ALTER TABLE %s
                    RENAME COLUMN %s TO %s
                ',
                $this->quoteIdentifier($childTable),
                $this->quoteIdentifier($temporaryColumn),
                $this->quoteIdentifier($childColumn)
            )
        );

        $indexName = $childTable . '_' . $childColumn . '_index';

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
     * Membuat ulang foreign key setelah parent menjadi UUID.
     */
    private function recreateForeignKey(
        object $reference,
        string $parentTable
    ): void {
        $childTable = (string) $reference->table_name;
        $childColumn = (string) $reference->column_name;
        $constraintName = (string) $reference->constraint_name;

        if (
            !Schema::hasTable($childTable)
            || !Schema::hasColumn($childTable, $childColumn)
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
                $this->quoteIdentifier($constraintName)
            )
        );

        $onUpdate = $this->normalizeForeignKeyAction(
            (string) $reference->update_rule
        );

        $onDelete = $this->normalizeForeignKeyAction(
            (string) $reference->delete_rule
        );

        DB::statement(
            sprintf(
                '
                    ALTER TABLE %1$s
                    ADD CONSTRAINT %2$s
                    FOREIGN KEY (%3$s)
                    REFERENCES %4$s(id)
                    ON UPDATE %5$s
                    ON DELETE %6$s
                ',
                $this->quoteIdentifier($childTable),
                $this->quoteIdentifier($constraintName),
                $this->quoteIdentifier($childColumn),
                $this->quoteIdentifier($parentTable),
                $onUpdate,
                $onDelete
            )
        );
    }

    /**
     * Mengambil semua foreign key yang mengarah ke parent table.
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
                    ON tc.constraint_name = kcu.constraint_name
                   AND tc.constraint_schema = kcu.constraint_schema
                INNER JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                   AND ccu.constraint_schema = tc.constraint_schema
                INNER JOIN information_schema.referential_constraints AS rc
                    ON rc.constraint_name = tc.constraint_name
                   AND rc.constraint_schema = tc.constraint_schema
                WHERE tc.constraint_type = \'FOREIGN KEY\'
                  AND tc.table_schema = current_schema()
                  AND ccu.table_schema = current_schema()
                  AND ccu.table_name = ?
                  AND ccu.column_name = ?
                ORDER BY tc.table_name, kcu.column_name
            ',
            [
                $parentTable,
                $parentColumn,
            ]
        );
    }

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
            [$table, $column]
        );

        if (!$result) {
            return null;
        }

        return $result->udt_name ?: $result->data_type;
    }

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
            [$table, $column]
        );

        return !$result
            || strtoupper((string) $result->is_nullable) === 'YES';
    }

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
            [$table]
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
                        (string) $constraint->constraint_name
                    )
                )
            );
        }
    }

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
            [$table]
        );

        foreach ($indexes as $index) {
            $indexName = (string) $index->indexname;
            $indexDefinition = (string) $index->indexdef;
            $lowerDefinition = strtolower($indexDefinition);

            if (
                str_contains($lowerDefinition, ' unique ')
                || str_contains(strtolower($indexName), 'pkey')
            ) {
                continue;
            }

            $pattern = sprintf(
                '/\(\s*"?%s"?\s*\)$/i',
                preg_quote($column, '/')
            );

            if (!preg_match($pattern, $indexDefinition)) {
                continue;
            }

            DB::statement(
                sprintf(
                    'DROP INDEX IF EXISTS %s',
                    $this->quoteIdentifier($indexName)
                )
            );
        }
    }

    private function normalizeForeignKeyAction(
        string $action
    ): string {
        return match (strtoupper(trim($action))) {
            'CASCADE' => 'CASCADE',
            'SET NULL' => 'SET NULL',
            'SET DEFAULT' => 'SET DEFAULT',
            'RESTRICT' => 'RESTRICT',
            'NO ACTION' => 'NO ACTION',
            default => 'NO ACTION',
        };
    }

    private function quoteIdentifier(
        string $identifier
    ): string {
        return '"'
            . str_replace('"', '""', $identifier)
            . '"';
    }
};
