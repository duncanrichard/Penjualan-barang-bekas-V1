<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up(): void
{
    Schema::table('document_reminders', function (Blueprint $table) {
        $table->foreignId('parent_id')
            ->nullable()
            ->after('id')
            ->constrained('document_reminders')
            ->nullOnDelete();

        $table->foreignId('root_id')
            ->nullable()
            ->after('parent_id')
            ->constrained('document_reminders')
            ->nullOnDelete();

        $table->unsignedInteger('cycle_number')
            ->default(1)
            ->after('root_id');

        $table->timestamp('completed_at')
            ->nullable()
            ->after('next_reminder_at');

        $table->timestamp('superseded_at')
            ->nullable()
            ->after('completed_at');

        $table->index([
            'root_id',
            'cycle_number',
        ]);

        $table->index([
            'status',
            'next_reminder_at',
        ]);
    });
}

    /**
     * Reverse the migrations.
     */
  public function down(): void
{
    Schema::table('document_reminders', function (Blueprint $table) {
        $table->dropForeign(['parent_id']);
        $table->dropForeign(['root_id']);

        $table->dropIndex([
            'root_id',
            'cycle_number',
        ]);

        $table->dropIndex([
            'status',
            'next_reminder_at',
        ]);

        $table->dropColumn([
            'parent_id',
            'root_id',
            'cycle_number',
            'completed_at',
            'superseded_at',
        ]);
    });
}
};
