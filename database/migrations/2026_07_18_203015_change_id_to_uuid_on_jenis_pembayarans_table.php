<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('jenis_pembayarans')) {
            throw new \RuntimeException(
                'Tabel jenis_pembayarans tidak ditemukan.'
            );
        }

        if ($this->columnType('jenis_pembayarans', 'id') === 'uuid') {
            return;
        }

        DB::transaction(function (): void {
            /*
             * Tambahkan kolom UUID sementara pada tabel master.
             */
            DB::statement('
                ALTER TABLE jenis_pembayarans
                ADD COLUMN IF NOT EXISTS id_uuid UUID NULL
            ');

            /*
             * Isi UUID untuk seluruh data lama.
             */
            DB::table('jenis_pembayarans')
                ->select([
                    'id',
                    'id_uuid',
                ])
                ->orderBy('id')
                ->get()
                ->each(function (object $row): void {
                    if ($row->id_uuid !== null) {
                        return;
                    }

                    DB::table('jenis_pembayarans')
                        ->where('id', $row->id)
                        ->update([
                            'id_uuid' => (string) Str::uuid(),
                        ]);
                });

            $missingMasterUuid = DB::table('jenis_pembayarans')
                ->whereNull('id_uuid')
                ->count();

            if ($missingMasterUuid > 0) {
                throw new \RuntimeException(
                    "Masih ada {$missingMasterUuid} data jenis pembayaran "
                    . 'yang belum memiliki UUID.'
                );
            }

            DB::statement('
                ALTER TABLE jenis_pembayarans
                ALTER COLUMN id_uuid SET NOT NULL
            ');

            /*
             * Ambil seluruh foreign key yang mengarah ke
             * jenis_pembayarans.id.
             */
            $references = $this->getReferencingForeignKeys();

            /*
             * Konversi setiap foreign key ke UUID.
             */
            foreach ($references as $reference) {
                $this->convertReferencingColumn($reference);
            }

            /*
             * Hapus primary key bigint lama.
             */
            $this->dropPrimaryKey('jenis_pembayarans');

            /*
             * Hapus kolom ID bigint lama.
             */
            DB::statement('
                ALTER TABLE jenis_pembayarans
                DROP COLUMN id
            ');

            /*
             * Rename UUID sementara menjadi id.
             */
            DB::statement('
                ALTER TABLE jenis_pembayarans
                RENAME COLUMN id_uuid TO id
            ');

            /*
             * Buat primary key UUID.
             */
            DB::statement('
                ALTER TABLE jenis_pembayarans
                ADD CONSTRAINT jenis_pembayarans_pkey
                PRIMARY KEY (id)
            ');

            /*
             * Buat ulang semua foreign key.
             */
            foreach ($references as $reference) {
                $this->recreateForeignKey($reference);
            }

            /*
             * Hapus sequence bigint lama.
             */
            DB::statement('
                DROP SEQUENCE IF EXISTS jenis_pembayarans_id_seq
            ');
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
     * Mengubah foreign key bigint menjadi UUID.
     */
    private function convertReferencingColumn(
        object $reference
    ): void {
        $table = (string) $reference->table_name;
        $column = (string) $reference->column_name;
        $constraint = (string) $reference->constraint_name;

        $temporaryColumn = $column . '_uuid';

        /*
         * Periksa tipe kolom.
         */
        $currentType = $this->columnType(
            $table,
            $column
        );

        /*
         * Jika sudah UUID, cukup lewati proses konversi.
         */
        if ($currentType === 'uuid') {
            return;
        }

        $isNullable = $this->columnIsNullable(
            $table,
            $column
        );

        /*
         * Tambahkan kolom UUID sementara.
         */
        DB::statement(
            sprintf(
                'ALTER TABLE %s ADD COLUMN IF NOT EXISTS %s UUID NULL',
                $this->quoteIdentifier($table),
                $this->quoteIdentifier($temporaryColumn)
            )
        );

        /*
         * Salin relasi bigint lama menjadi UUID.
         */
        DB::statement(
            sprintf(
                '
                    UPDATE %1$s AS child
                    SET %2$s = parent.id_uuid
                    FROM jenis_pembayarans AS parent
                    WHERE child.%3$s = parent.id
                      AND child.%3$s IS NOT NULL
                      AND child.%2$s IS NULL
                ',
                $this->quoteIdentifier($table),
                $this->quoteIdentifier($temporaryColumn),
                $this->quoteIdentifier($column)
            )
        );

        /*
         * Pastikan semua foreign key lama berhasil dipetakan.
         */
        $invalidCount = DB::table($table)
            ->whereNotNull($column)
            ->whereNull($temporaryColumn)
            ->count();

        if ($invalidCount > 0) {
            throw new \RuntimeException(
                "Ada {$invalidCount} data pada {$table}.{$column} "
                . 'yang gagal dipetakan ke UUID.'
            );
        }

        /*
         * Pertahankan NOT NULL bila kolom lama wajib diisi.
         */
        if (!$isNullable) {
            $emptyCount = DB::table($table)
                ->whereNull($temporaryColumn)
                ->count();

            if ($emptyCount > 0) {
                throw new \RuntimeException(
                    "Kolom {$table}.{$column} wajib diisi, tetapi "
                    . "terdapat {$emptyCount} data tanpa relasi."
                );
            }

            DB::statement(
                sprintf(
                    'ALTER TABLE %s ALTER COLUMN %s SET NOT NULL',
                    $this->quoteIdentifier($table),
                    $this->quoteIdentifier($temporaryColumn)
                )
            );
        }

        /*
         * Hapus foreign key lama.
         */
        DB::statement(
            sprintf(
                'ALTER TABLE %s DROP CONSTRAINT IF EXISTS %s',
                $this->quoteIdentifier($table),
                $this->quoteIdentifier($constraint)
            )
        );

        /*
         * Hapus index biasa yang hanya menggunakan kolom lama.
         */
        $this->dropSingleColumnIndexes(
            $table,
            $column
        );

        /*
         * Hapus kolom bigint lama.
         */
        DB::statement(
            sprintf(
                'ALTER TABLE %s DROP COLUMN %s',
                $this->quoteIdentifier($table),
                $this->quoteIdentifier($column)
            )
        );

        /*
         * Rename kolom UUID sementara.
         */
        DB::statement(
            sprintf(
                'ALTER TABLE %s RENAME COLUMN %s TO %s',
                $this->quoteIdentifier($table),
                $this->quoteIdentifier($temporaryColumn),
                $this->quoteIdentifier($column)
            )
        );

        /*
         * Buat index untuk kolom UUID.
         */
        $indexName = $table . '_' . $column . '_index';

        DB::statement(
            sprintf(
                'CREATE INDEX IF NOT EXISTS %s ON %s (%s)',
                $this->quoteIdentifier($indexName),
                $this->quoteIdentifier($table),
                $this->quoteIdentifier($column)
            )
        );
    }

    /**
     * Membuat kembali foreign key UUID.
     */
    private function recreateForeignKey(
        object $reference
    ): void {
        $table = (string) $reference->table_name;
        $column = (string) $reference->column_name;

        if (
            !Schema::hasTable($table)
            || !Schema::hasColumn($table, $column)
        ) {
            return;
        }

        $constraintName = (string) $reference->constraint_name;

        /*
         * Pastikan constraint lama tidak tersisa.
         */
        DB::statement(
            sprintf(
                'ALTER TABLE %s DROP CONSTRAINT IF EXISTS %s',
                $this->quoteIdentifier($table),
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
                    REFERENCES jenis_pembayarans(id)
                    ON UPDATE %4$s
                    ON DELETE %5$s
                ',
                $this->quoteIdentifier($table),
                $this->quoteIdentifier($constraintName),
                $this->quoteIdentifier($column),
                $onUpdate,
                $onDelete
            )
        );
    }

    /**
     * Mengambil seluruh foreign key yang mengarah ke
     * jenis_pembayarans.id.
     */
    private function getReferencingForeignKeys(): array
    {
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
                  AND ccu.table_name = \'jenis_pembayarans\'
                  AND ccu.column_name = \'id\'
                ORDER BY tc.table_name, kcu.column_name
            '
        );
    }

    /**
     * Mengambil tipe kolom PostgreSQL.
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
                    'ALTER TABLE %s DROP CONSTRAINT IF EXISTS %s',
                    $this->quoteIdentifier($table),
                    $this->quoteIdentifier(
                        (string) $constraint->constraint_name
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
            $indexName = (string) $index->indexname;
            $indexDefinition = (string) $index->indexdef;
            $lowerDefinition = strtolower($indexDefinition);

            /*
             * Jangan hapus primary key atau unique index.
             */
            if (
                str_contains($lowerDefinition, ' unique ')
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

    /**
     * Normalisasi aturan foreign key PostgreSQL.
     */
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

    /**
     * Mengamankan identifier PostgreSQL.
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
