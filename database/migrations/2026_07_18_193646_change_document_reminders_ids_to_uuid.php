<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        /*
         * PostgreSQL membutuhkan pgcrypto agar bisa memakai gen_random_uuid().
         */
        DB::statement('CREATE EXTENSION IF NOT EXISTS pgcrypto');

        DB::transaction(function () {
            /*
             * =========================================================
             * 1. Tambahkan kolom UUID sementara
             * =========================================================
             */

            DB::statement("
                ALTER TABLE document_reminders
                ADD COLUMN id_uuid UUID
            ");

            DB::statement("
                ALTER TABLE document_reminders
                ADD COLUMN parent_id_uuid UUID NULL
            ");

            DB::statement("
                ALTER TABLE document_reminders
                ADD COLUMN root_id_uuid UUID NULL
            ");

            DB::statement("
                ALTER TABLE document_reminder_logs
                ADD COLUMN id_uuid UUID
            ");

            DB::statement("
                ALTER TABLE document_reminder_logs
                ADD COLUMN document_reminder_id_uuid UUID NULL
            ");

            /*
             * =========================================================
             * 2. Generate UUID untuk record yang sudah ada
             * =========================================================
             */

            DB::statement("
                UPDATE document_reminders
                SET id_uuid = gen_random_uuid()
                WHERE id_uuid IS NULL
            ");

            DB::statement("
                UPDATE document_reminder_logs
                SET id_uuid = gen_random_uuid()
                WHERE id_uuid IS NULL
            ");

            /*
             * =========================================================
             * 3. Pindahkan relasi parent_id ke UUID
             * =========================================================
             */

            DB::statement("
                UPDATE document_reminders AS child
                SET parent_id_uuid = parent.id_uuid
                FROM document_reminders AS parent
                WHERE child.parent_id = parent.id
            ");

            /*
             * =========================================================
             * 4. Pindahkan relasi root_id ke UUID
             * =========================================================
             */

            DB::statement("
                UPDATE document_reminders AS child
                SET root_id_uuid = root_reminder.id_uuid
                FROM document_reminders AS root_reminder
                WHERE child.root_id = root_reminder.id
            ");

            /*
             * =========================================================
             * 5. Pindahkan relasi log ke UUID reminder
             * =========================================================
             */

            DB::statement("
                UPDATE document_reminder_logs AS reminder_log
                SET document_reminder_id_uuid = reminder.id_uuid
                FROM document_reminders AS reminder
                WHERE reminder_log.document_reminder_id = reminder.id
            ");

            /*
             * Pastikan seluruh UUID utama sudah terisi.
             */
            DB::statement("
                ALTER TABLE document_reminders
                ALTER COLUMN id_uuid SET NOT NULL
            ");

            DB::statement("
                ALTER TABLE document_reminder_logs
                ALTER COLUMN id_uuid SET NOT NULL
            ");

            /*
             * document_reminder_id sebelumnya NOT NULL.
             */
            DB::statement("
                ALTER TABLE document_reminder_logs
                ALTER COLUMN document_reminder_id_uuid SET NOT NULL
            ");

            /*
             * =========================================================
             * 6. Hapus foreign key lama secara dinamis
             * =========================================================
             */

            $this->dropForeignKeysForColumn(
                'document_reminders',
                'parent_id'
            );

            $this->dropForeignKeysForColumn(
                'document_reminders',
                'root_id'
            );

            $this->dropForeignKeysForColumn(
                'document_reminder_logs',
                'document_reminder_id'
            );

            /*
             * =========================================================
             * 7. Hapus primary key lama
             * =========================================================
             */

            $this->dropPrimaryKey('document_reminders');
            $this->dropPrimaryKey('document_reminder_logs');

            /*
             * =========================================================
             * 8. Hapus kolom bigint lama
             * =========================================================
             */

            DB::statement("
                ALTER TABLE document_reminder_logs
                DROP COLUMN document_reminder_id
            ");

            DB::statement("
                ALTER TABLE document_reminder_logs
                DROP COLUMN id
            ");

            DB::statement("
                ALTER TABLE document_reminders
                DROP COLUMN parent_id
            ");

            DB::statement("
                ALTER TABLE document_reminders
                DROP COLUMN root_id
            ");

            DB::statement("
                ALTER TABLE document_reminders
                DROP COLUMN id
            ");

            /*
             * =========================================================
             * 9. Rename kolom UUID menjadi nama kolom sebenarnya
             * =========================================================
             */

            DB::statement("
                ALTER TABLE document_reminders
                RENAME COLUMN id_uuid TO id
            ");

            DB::statement("
                ALTER TABLE document_reminders
                RENAME COLUMN parent_id_uuid TO parent_id
            ");

            DB::statement("
                ALTER TABLE document_reminders
                RENAME COLUMN root_id_uuid TO root_id
            ");

            DB::statement("
                ALTER TABLE document_reminder_logs
                RENAME COLUMN id_uuid TO id
            ");

            DB::statement("
                ALTER TABLE document_reminder_logs
                RENAME COLUMN document_reminder_id_uuid
                TO document_reminder_id
            ");

            /*
             * =========================================================
             * 10. Buat primary key UUID baru
             * =========================================================
             */

            DB::statement("
                ALTER TABLE document_reminders
                ADD CONSTRAINT document_reminders_pkey
                PRIMARY KEY (id)
            ");

            DB::statement("
                ALTER TABLE document_reminder_logs
                ADD CONSTRAINT document_reminder_logs_pkey
                PRIMARY KEY (id)
            ");

            /*
             * =========================================================
             * 11. Buat kembali foreign key UUID
             * =========================================================
             */

            DB::statement("
                ALTER TABLE document_reminders
                ADD CONSTRAINT document_reminders_parent_id_foreign
                FOREIGN KEY (parent_id)
                REFERENCES document_reminders(id)
                ON DELETE SET NULL
            ");

            DB::statement("
                ALTER TABLE document_reminders
                ADD CONSTRAINT document_reminders_root_id_foreign
                FOREIGN KEY (root_id)
                REFERENCES document_reminders(id)
                ON DELETE SET NULL
            ");

            DB::statement("
                ALTER TABLE document_reminder_logs
                ADD CONSTRAINT document_reminder_logs_document_reminder_id_foreign
                FOREIGN KEY (document_reminder_id)
                REFERENCES document_reminders(id)
                ON DELETE CASCADE
            ");

            /*
             * =========================================================
             * 12. Buat index baru
             * =========================================================
             */

            DB::statement("
                CREATE INDEX IF NOT EXISTS
                document_reminders_parent_id_index
                ON document_reminders(parent_id)
            ");

            DB::statement("
                CREATE INDEX IF NOT EXISTS
                document_reminders_root_id_index
                ON document_reminders(root_id)
            ");

            DB::statement("
                CREATE INDEX IF NOT EXISTS
                document_reminders_root_cycle_index
                ON document_reminders(root_id, cycle_number)
            ");

            DB::statement("
                CREATE INDEX IF NOT EXISTS
                document_reminder_logs_reminder_id_index
                ON document_reminder_logs(document_reminder_id)
            ");

            /*
             * =========================================================
             * 13. Hapus sequence bigint lama bila masih tersedia
             * =========================================================
             */

            DB::statement("
                DROP SEQUENCE IF EXISTS document_reminders_id_seq
            ");

            DB::statement("
                DROP SEQUENCE IF EXISTS document_reminder_logs_id_seq
            ");
        });
    }

    public function down(): void
    {
        /*
         * UUID yang sudah dibuat tidak dapat dikembalikan secara aman
         * menjadi ID bigint lama.
         */
        throw new RuntimeException(
            'Migration UUID ini tidak dapat di-rollback otomatis. '
            . 'Pulihkan database dari backup jika ingin kembali ke bigint.'
        );
    }

    private function dropForeignKeysForColumn(
        string $table,
        string $column
    ): void {
        $constraints = DB::select(
            "
                SELECT DISTINCT tc.constraint_name
                FROM information_schema.table_constraints AS tc
                INNER JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.constraint_schema = kcu.constraint_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND tc.table_schema = current_schema()
                    AND tc.table_name = ?
                    AND kcu.column_name = ?
            ",
            [$table, $column]
        );

        foreach ($constraints as $constraint) {
            $constraintName = str_replace(
                '"',
                '""',
                $constraint->constraint_name
            );

            DB::statement(
                sprintf(
                    'ALTER TABLE "%s" DROP CONSTRAINT "%s"',
                    str_replace('"', '""', $table),
                    $constraintName
                )
            );
        }
    }

    private function dropPrimaryKey(string $table): void
    {
        $constraints = DB::select(
            "
                SELECT tc.constraint_name
                FROM information_schema.table_constraints AS tc
                WHERE tc.constraint_type = 'PRIMARY KEY'
                    AND tc.table_schema = current_schema()
                    AND tc.table_name = ?
            ",
            [$table]
        );

        foreach ($constraints as $constraint) {
            $constraintName = str_replace(
                '"',
                '""',
                $constraint->constraint_name
            );

            DB::statement(
                sprintf(
                    'ALTER TABLE "%s" DROP CONSTRAINT "%s"',
                    str_replace('"', '""', $table),
                    $constraintName
                )
            );
        }
    }
};
