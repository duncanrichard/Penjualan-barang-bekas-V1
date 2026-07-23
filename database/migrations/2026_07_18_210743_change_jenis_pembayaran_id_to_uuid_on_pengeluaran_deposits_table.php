<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('pengeluaran_deposits')) {
            throw new \RuntimeException(
                'Tabel pengeluaran_deposits tidak ditemukan.'
            );
        }

        if (!Schema::hasTable('jenis_pembayarans')) {
            throw new \RuntimeException(
                'Tabel jenis_pembayarans tidak ditemukan.'
            );
        }

        if (
            !Schema::hasColumn(
                'pengeluaran_deposits',
                'jenis_pembayaran_id'
            )
        ) {
            throw new \RuntimeException(
                'Kolom pengeluaran_deposits.jenis_pembayaran_id tidak ditemukan.'
            );
        }

        /*
         * Hentikan jika kolom sudah UUID.
         */
        if (
            $this->columnType(
                'pengeluaran_deposits',
                'jenis_pembayaran_id'
            ) === 'uuid'
        ) {
            return;
        }

        DB::transaction(function (): void {
            /*
             * Tambahkan kolom UUID sementara.
             */
            DB::statement('
                ALTER TABLE pengeluaran_deposits
                ADD COLUMN IF NOT EXISTS
                jenis_pembayaran_id_uuid UUID NULL
            ');

            /*
             * Pemetaan ID lama ke UUID baru.
             *
             * Pemetaan dilakukan berdasarkan urutan ID lama dan master
             * apabila kolom legacy_id tersedia.
             *
             * Jika tidak ada legacy_id, migration mencoba mencocokkan:
             * 1 = pembayaran cash
             * 2 = pembayaran non-cash pertama
             */
            $hasLegacyId = Schema::hasColumn(
                'jenis_pembayarans',
                'legacy_id'
            );

            if ($hasLegacyId) {
                DB::statement('
                    UPDATE pengeluaran_deposits AS deposit
                    SET jenis_pembayaran_id_uuid =
                        jenis_pembayaran.id
                    FROM jenis_pembayarans AS jenis_pembayaran
                    WHERE deposit.jenis_pembayaran_id =
                        jenis_pembayaran.legacy_id
                      AND deposit.jenis_pembayaran_id IS NOT NULL
                      AND deposit.jenis_pembayaran_id_uuid IS NULL
                ');
            } else {
                /*
                 * Cari nilai lama yang digunakan.
                 */
                $legacyIds = DB::table(
                    'pengeluaran_deposits'
                )
                    ->whereNotNull(
                        'jenis_pembayaran_id'
                    )
                    ->distinct()
                    ->orderBy(
                        'jenis_pembayaran_id'
                    )
                    ->pluck(
                        'jenis_pembayaran_id'
                    );

                foreach ($legacyIds as $legacyId) {
                    $legacyId = (int) $legacyId;

                    /*
                     * ID lama 1 biasanya Cash.
                     */
                    if ($legacyId === 1) {
                        $documentType = DB::table(
                            'jenis_pembayarans'
                        )
                            ->where(
                                'is_cash',
                                true
                            )
                            ->where(
                                'is_active',
                                true
                            )
                            ->orderBy('nama')
                            ->first();
                    } else {
                        /*
                         * ID selain 1 dipetakan berdasarkan urutan
                         * pembayaran non-cash aktif.
                         */
                        $documentType = DB::table(
                            'jenis_pembayarans'
                        )
                            ->where(
                                'is_cash',
                                false
                            )
                            ->where(
                                'is_active',
                                true
                            )
                            ->orderBy('nama')
                            ->offset(
                                max(0, $legacyId - 2)
                            )
                            ->first();
                    }

                    if (!$documentType) {
                        throw new \RuntimeException(
                            "Tidak ditemukan master jenis pembayaran "
                            . "untuk ID lama {$legacyId}. "
                            . 'Tambahkan mapping manual pada migration.'
                        );
                    }

                    DB::table('pengeluaran_deposits')
                        ->where(
                            'jenis_pembayaran_id',
                            $legacyId
                        )
                        ->whereNull(
                            'jenis_pembayaran_id_uuid'
                        )
                        ->update([
                            'jenis_pembayaran_id_uuid' =>
                                $documentType->id,
                        ]);
                }
            }

            /*
             * Periksa data yang gagal dipetakan.
             */
            $unmapped = DB::table(
                'pengeluaran_deposits'
            )
                ->whereNotNull(
                    'jenis_pembayaran_id'
                )
                ->whereNull(
                    'jenis_pembayaran_id_uuid'
                )
                ->distinct()
                ->pluck(
                    'jenis_pembayaran_id'
                );

            if ($unmapped->isNotEmpty()) {
                throw new \RuntimeException(
                    'Masih ada ID jenis pembayaran lama '
                    . 'yang gagal dipetakan: '
                    . $unmapped->implode(', ')
                );
            }

            /*
             * Pertahankan nullable kolom lama.
             */
            $isNullable = $this->columnIsNullable(
                'pengeluaran_deposits',
                'jenis_pembayaran_id'
            );

            if (!$isNullable) {
                $nullCount = DB::table(
                    'pengeluaran_deposits'
                )
                    ->whereNull(
                        'jenis_pembayaran_id_uuid'
                    )
                    ->count();

                if ($nullCount > 0) {
                    throw new \RuntimeException(
                        "Terdapat {$nullCount} data deposit "
                        . 'tanpa jenis pembayaran.'
                    );
                }

                DB::statement('
                    ALTER TABLE pengeluaran_deposits
                    ALTER COLUMN jenis_pembayaran_id_uuid
                    SET NOT NULL
                ');
            }

            /*
             * Hapus foreign key lama.
             */
            $this->dropForeignKeysForColumn(
                'pengeluaran_deposits',
                'jenis_pembayaran_id'
            );

            /*
             * Hapus index lama.
             */
            $this->dropIndexesForColumn(
                'pengeluaran_deposits',
                'jenis_pembayaran_id'
            );

            /*
             * Hapus kolom bigint lama.
             */
            DB::statement('
                ALTER TABLE pengeluaran_deposits
                DROP COLUMN jenis_pembayaran_id
            ');

            /*
             * Rename kolom UUID.
             */
            DB::statement('
                ALTER TABLE pengeluaran_deposits
                RENAME COLUMN jenis_pembayaran_id_uuid
                TO jenis_pembayaran_id
            ');

            /*
             * Buat index baru.
             */
            DB::statement('
                CREATE INDEX IF NOT EXISTS
                pengeluaran_deposits_jenis_pembayaran_id_index
                ON pengeluaran_deposits(jenis_pembayaran_id)
            ');

            /*
             * Buat foreign key UUID.
             */
            DB::statement('
                ALTER TABLE pengeluaran_deposits
                ADD CONSTRAINT
                pengeluaran_deposits_jenis_pembayaran_id_foreign
                FOREIGN KEY (jenis_pembayaran_id)
                REFERENCES jenis_pembayarans(id)
                ON UPDATE CASCADE
                ON DELETE RESTRICT
            ');
        });
    }

    public function down(): void
    {
        throw new \RuntimeException(
            'Rollback UUID ke bigint tidak disediakan karena '
            . 'dapat merusak hubungan data.'
        );
    }

    private function columnType(
        string $table,
        string $column
    ): ?string {
        $result = DB::selectOne(
            '
                SELECT udt_name
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

        return $result
            ? (string) $result->udt_name
            : null;
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

    private function dropForeignKeysForColumn(
        string $table,
        string $column
    ): void {
        $constraints = DB::select(
            '
                SELECT DISTINCT
                    tc.constraint_name
                FROM information_schema.table_constraints AS tc
                INNER JOIN information_schema.key_column_usage AS kcu
                    ON kcu.constraint_name =
                        tc.constraint_name
                   AND kcu.constraint_schema =
                        tc.constraint_schema
                WHERE tc.constraint_type = \'FOREIGN KEY\'
                  AND tc.table_schema = current_schema()
                  AND tc.table_name = ?
                  AND kcu.column_name = ?
            ',
            [
                $table,
                $column,
            ]
        );

        foreach ($constraints as $constraint) {
            DB::statement(
                sprintf(
                    'ALTER TABLE %s DROP CONSTRAINT IF EXISTS %s',
                    $this->quoteIdentifier($table),
                    $this->quoteIdentifier(
                        (string) $constraint
                            ->constraint_name
                    )
                )
            );
        }
    }

    private function dropIndexesForColumn(
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
            $indexName =
                (string) $index->indexname;

            $definition =
                (string) $index->indexdef;

            if (
                str_contains(
                    strtolower($indexName),
                    'pkey'
                )
                || str_contains(
                    strtolower($definition),
                    ' unique '
                )
            ) {
                continue;
            }

            $pattern = sprintf(
                '/\(\s*"?%s"?\s*\)$/i',
                preg_quote($column, '/')
            );

            if (!preg_match($pattern, $definition)) {
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
