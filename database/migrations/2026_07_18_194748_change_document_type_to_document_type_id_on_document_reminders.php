<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('document_reminders')) {
            throw new \RuntimeException(
                'Tabel document_reminders tidak ditemukan.'
            );
        }

        if (!Schema::hasTable('document_types')) {
            throw new \RuntimeException(
                'Tabel document_types tidak ditemukan.'
            );
        }

        DB::transaction(function (): void {
            if (
                Schema::hasColumn(
                    'document_reminders',
                    'document_type_id'
                )
                && !Schema::hasColumn(
                    'document_reminders',
                    'document_type'
                )
            ) {
                return;
            }

            DB::statement("
                ALTER TABLE document_reminders
                ADD COLUMN IF NOT EXISTS document_type_id UUID NULL
            ");

            $oldTypes = DB::table('document_reminders')
                ->whereNotNull('document_type')
                ->whereRaw("TRIM(document_type) <> ''")
                ->distinct()
                ->pluck('document_type');

            foreach ($oldTypes as $oldType) {
                $oldType = trim((string) $oldType);

                if ($oldType === '') {
                    continue;
                }

                $normalizedCode = Str::of($oldType)
                    ->lower()
                    ->replaceMatches('/[^a-z0-9]+/', '_')
                    ->replaceMatches('/_+/', '_')
                    ->trim('_')
                    ->toString();

                $documentType = DB::table('document_types')
                    ->where(function ($query) use (
                        $oldType,
                        $normalizedCode
                    ): void {
                        $query
                            ->whereRaw(
                                'LOWER(TRIM(code)) = ?',
                                [strtolower($oldType)]
                            )
                            ->orWhereRaw(
                                'LOWER(TRIM(code)) = ?',
                                [strtolower($normalizedCode)]
                            )
                            ->orWhereRaw(
                                'LOWER(TRIM(name)) = ?',
                                [strtolower($oldType)]
                            );
                    })
                    ->first();

                if (!$documentType) {
                    $documentTypeId = (string) Str::uuid();

                    DB::table('document_types')->insert([
                        'id' => $documentTypeId,
                        'code' => $normalizedCode,
                        'name' => Str::of($oldType)
                            ->replace('_', ' ')
                            ->title()
                            ->toString(),
                        'description' =>
                            'Jenis dokumen hasil migrasi.',
                        'is_active' => true,
                        'sort_order' =>
                            ((int) DB::table('document_types')
                                ->max('sort_order')) + 1,
                        'created_by' => null,
                        'updated_by' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                        'deleted_at' => null,
                    ]);

                    $documentType = DB::table(
                        'document_types'
                    )
                        ->where('id', $documentTypeId)
                        ->first();
                }

                DB::table('document_reminders')
                    ->whereRaw(
                        'LOWER(TRIM(document_type)) = ?',
                        [strtolower($oldType)]
                    )
                    ->whereNull('document_type_id')
                    ->update([
                        'document_type_id' =>
                            $documentType->id,
                    ]);
            }

            $unmatched = DB::table(
                'document_reminders'
            )
                ->whereNull('document_type_id')
                ->count();

            if ($unmatched > 0) {
                throw new \RuntimeException(
                    "Masih ada {$unmatched} reminder yang belum memiliki document_type_id."
                );
            }

            DB::statement("
                ALTER TABLE document_reminders
                ALTER COLUMN document_type_id SET NOT NULL
            ");

            DB::statement("
                ALTER TABLE document_reminders
                DROP CONSTRAINT IF EXISTS
                document_reminders_document_type_id_foreign
            ");

            DB::statement("
                ALTER TABLE document_reminders
                ADD CONSTRAINT
                document_reminders_document_type_id_foreign
                FOREIGN KEY (document_type_id)
                REFERENCES document_types(id)
                ON UPDATE CASCADE
                ON DELETE RESTRICT
            ");

            DB::statement("
                CREATE INDEX IF NOT EXISTS
                document_reminders_document_type_id_index
                ON document_reminders(document_type_id)
            ");

            if (
                Schema::hasColumn(
                    'document_reminders',
                    'document_type'
                )
            ) {
                DB::statement("
                    ALTER TABLE document_reminders
                    DROP COLUMN document_type
                ");
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('document_reminders')) {
            return;
        }

        DB::transaction(function (): void {
            DB::statement("
                ALTER TABLE document_reminders
                ADD COLUMN IF NOT EXISTS
                document_type VARCHAR(100) NULL
            ");

            if (
                Schema::hasColumn(
                    'document_reminders',
                    'document_type_id'
                )
            ) {
                DB::statement("
                    UPDATE document_reminders AS reminder
                    SET document_type = document_type_master.code
                    FROM document_types AS document_type_master
                    WHERE reminder.document_type_id
                        = document_type_master.id
                ");
            }

            DB::statement("
                ALTER TABLE document_reminders
                DROP CONSTRAINT IF EXISTS
                document_reminders_document_type_id_foreign
            ");

            DB::statement("
                DROP INDEX IF EXISTS
                document_reminders_document_type_id_index
            ");

            if (
                Schema::hasColumn(
                    'document_reminders',
                    'document_type_id'
                )
            ) {
                DB::statement("
                    ALTER TABLE document_reminders
                    DROP COLUMN document_type_id
                ");
            }
        });
    }
};
