<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /*
        |--------------------------------------------------------------------------
        | Hapus unique tanggal pengeluarans
        |--------------------------------------------------------------------------
        */
        DB::statement('ALTER TABLE pengeluarans DROP CONSTRAINT IF EXISTS pengeluarans_tanggal_unique');

        /*
        |--------------------------------------------------------------------------
        | Buat / perbaiki tabel jenis_pembayarans
        |--------------------------------------------------------------------------
        */
        if (!Schema::hasTable('jenis_pembayarans')) {
            Schema::create('jenis_pembayarans', function (Blueprint $table) {
                $table->id();
                $table->string('nama', 100);
                $table->string('kode', 50)->nullable();
                $table->boolean('is_cash')->default(false);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        } else {
            Schema::table('jenis_pembayarans', function (Blueprint $table) {
                if (!Schema::hasColumn('jenis_pembayarans', 'nama')) {
                    $table->string('nama', 100)->nullable();
                }

                if (!Schema::hasColumn('jenis_pembayarans', 'kode')) {
                    $table->string('kode', 50)->nullable();
                }

                if (!Schema::hasColumn('jenis_pembayarans', 'is_cash')) {
                    $table->boolean('is_cash')->default(false);
                }

                if (!Schema::hasColumn('jenis_pembayarans', 'is_active')) {
                    $table->boolean('is_active')->default(true);
                }

                if (!Schema::hasColumn('jenis_pembayarans', 'created_at')) {
                    $table->timestamps();
                }
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Isi data default jenis pembayaran
        |--------------------------------------------------------------------------
        */
        $defaultPayments = [
            [
                'nama' => 'Cash',
                'kode' => 'cash',
                'is_cash' => true,
            ],
            [
                'nama' => 'TF BCA',
                'kode' => 'tf_bca',
                'is_cash' => false,
            ],
            [
                'nama' => 'TF BRI',
                'kode' => 'tf_bri',
                'is_cash' => false,
            ],
            [
                'nama' => 'TF Mandiri',
                'kode' => 'tf_mandiri',
                'is_cash' => false,
            ],
            [
                'nama' => 'TF BNI',
                'kode' => 'tf_bni',
                'is_cash' => false,
            ],
            [
                'nama' => 'QRIS',
                'kode' => 'qris',
                'is_cash' => false,
            ],
        ];

        foreach ($defaultPayments as $payment) {
            DB::table('jenis_pembayarans')->updateOrInsert(
                [
                    'kode' => $payment['kode'],
                ],
                [
                    'nama' => $payment['nama'],
                    'is_cash' => $payment['is_cash'],
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Tambahkan unique index kode jika belum ada
        |--------------------------------------------------------------------------
        */
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS jenis_pembayarans_kode_unique ON jenis_pembayarans (kode)');

        /*
        |--------------------------------------------------------------------------
        | Buat tabel pengeluaran_deposits
        |--------------------------------------------------------------------------
        */
        if (!Schema::hasTable('pengeluaran_deposits')) {
            Schema::create('pengeluaran_deposits', function (Blueprint $table) {
                $table->id();
                $table->uuid('pengeluaran_id');
                $table->foreignId('jenis_pembayaran_id');
                $table->decimal('nominal', 15, 2)->default(0);
                $table->text('catatan')->nullable();
                $table->timestamps();

                $table->foreign('pengeluaran_id')
                    ->references('id')
                    ->on('pengeluarans')
                    ->cascadeOnDelete();

                $table->foreign('jenis_pembayaran_id')
                    ->references('id')
                    ->on('jenis_pembayarans')
                    ->cascadeOnDelete();

                $table->unique(
                    ['pengeluaran_id', 'jenis_pembayaran_id'],
                    'pengeluaran_deposit_unique'
                );
            });
        } else {
            Schema::table('pengeluaran_deposits', function (Blueprint $table) {
                if (!Schema::hasColumn('pengeluaran_deposits', 'pengeluaran_id')) {
                    $table->uuid('pengeluaran_id')->nullable();
                }

                if (!Schema::hasColumn('pengeluaran_deposits', 'jenis_pembayaran_id')) {
                    $table->foreignId('jenis_pembayaran_id')->nullable();
                }

                if (!Schema::hasColumn('pengeluaran_deposits', 'nominal')) {
                    $table->decimal('nominal', 15, 2)->default(0);
                }

                if (!Schema::hasColumn('pengeluaran_deposits', 'catatan')) {
                    $table->text('catatan')->nullable();
                }

                if (!Schema::hasColumn('pengeluaran_deposits', 'created_at')) {
                    $table->timestamps();
                }
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Tambah jenis_pembayaran_id ke pengeluaran_items
        |--------------------------------------------------------------------------
        */
        if (Schema::hasTable('pengeluaran_items')) {
            Schema::table('pengeluaran_items', function (Blueprint $table) {
                if (!Schema::hasColumn('pengeluaran_items', 'jenis_pembayaran_id')) {
                    $table->foreignId('jenis_pembayaran_id')
                        ->nullable()
                        ->after('metode_pembayaran');
                }
            });

            DB::statement('
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.table_constraints
                        WHERE constraint_name = \'pengeluaran_items_jenis_pembayaran_id_foreign\'
                    ) THEN
                        ALTER TABLE pengeluaran_items
                        ADD CONSTRAINT pengeluaran_items_jenis_pembayaran_id_foreign
                        FOREIGN KEY (jenis_pembayaran_id)
                        REFERENCES jenis_pembayarans(id)
                        ON DELETE SET NULL;
                    END IF;
                END $$;
            ');
        }

        /*
        |--------------------------------------------------------------------------
        | Migrasi item lama cash / tf ke jenis_pembayaran_id
        |--------------------------------------------------------------------------
        */
        if (
            Schema::hasTable('pengeluaran_items') &&
            Schema::hasColumn('pengeluaran_items', 'jenis_pembayaran_id')
        ) {
            $cashId = DB::table('jenis_pembayarans')
                ->where('kode', 'cash')
                ->value('id');

            $tfBcaId = DB::table('jenis_pembayarans')
                ->where('kode', 'tf_bca')
                ->value('id');

            if ($cashId) {
                DB::table('pengeluaran_items')
                    ->whereNull('jenis_pembayaran_id')
                    ->where('metode_pembayaran', 'cash')
                    ->update([
                        'jenis_pembayaran_id' => $cashId,
                    ]);
            }

            if ($tfBcaId) {
                DB::table('pengeluaran_items')
                    ->whereNull('jenis_pembayaran_id')
                    ->where('metode_pembayaran', 'tf')
                    ->update([
                        'jenis_pembayaran_id' => $tfBcaId,
                    ]);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Migrasi deposit_cash lama ke pengeluaran_deposits Cash
        |--------------------------------------------------------------------------
        */
        $cashId = DB::table('jenis_pembayarans')
            ->where('kode', 'cash')
            ->value('id');

        if (
            $cashId &&
            Schema::hasTable('pengeluaran_deposits') &&
            Schema::hasTable('pengeluarans') &&
            Schema::hasColumn('pengeluarans', 'deposit_cash')
        ) {
            $pengeluarans = DB::table('pengeluarans')
                ->select('id', 'deposit_cash')
                ->whereNotNull('deposit_cash')
                ->get();

            foreach ($pengeluarans as $pengeluaran) {
                DB::table('pengeluaran_deposits')->updateOrInsert(
                    [
                        'pengeluaran_id' => $pengeluaran->id,
                        'jenis_pembayaran_id' => $cashId,
                    ],
                    [
                        'nominal' => $pengeluaran->deposit_cash ?? 0,
                        'catatan' => 'Migrasi dari deposit cash lama.',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('pengeluaran_items')) {
            Schema::table('pengeluaran_items', function (Blueprint $table) {
                if (Schema::hasColumn('pengeluaran_items', 'jenis_pembayaran_id')) {
                    $table->dropForeign(['jenis_pembayaran_id']);
                    $table->dropColumn('jenis_pembayaran_id');
                }
            });
        }

        Schema::dropIfExists('pengeluaran_deposits');

        DB::statement('DROP INDEX IF EXISTS jenis_pembayarans_kode_unique');

        /*
        |--------------------------------------------------------------------------
        | Tabel jenis_pembayarans tidak saya drop otomatis
        |--------------------------------------------------------------------------
        | Karena bisa jadi sudah terlanjur ada data dan dipakai.
        */
    }
};
