<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_reminder_logs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('document_reminder_id')
                ->constrained('document_reminders')
                ->cascadeOnDelete();

            $table->string('send_to', 30);
            $table->text('message');

            $table->enum('channel', [
                'whatsapp',
            ])->default('whatsapp');

            $table->enum('status', [
                'success',
                'failed',
            ]);

            $table->text('response')->nullable();
            $table->timestamp('sent_at')->nullable();

            $table->timestamps();

            $table->index(['document_reminder_id']);
            $table->index(['status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_reminder_logs');
    }
};
