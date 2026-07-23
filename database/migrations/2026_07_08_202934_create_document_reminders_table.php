<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_reminders', function (Blueprint $table) {
            $table->id();

            // Data utama dokumen
            $table->string('document_type', 100);
            // contoh: service_kendaraan, pbb, stnk, asuransi, kontrak, lainnya

            $table->string('document_name');
            // contoh: Service Berkala Motor B 1234 ABC, PBB Rumah Bekasi

            $table->string('document_number')->nullable();
            // contoh: nomor polisi, nomor SPPT PBB, nomor polis, nomor kontrak

            $table->text('description')->nullable();

            // Data pemilik dokumen
            $table->string('owner_name');
            $table->string('owner_phone', 30);
            $table->string('owner_email')->nullable();

            // Data objek dokumen
            $table->string('object_name')->nullable();
            // contoh: Honda PCX 160, Rumah Bekasi, Ruko, Mobil Operasional

            $table->string('object_identity')->nullable();
            // contoh: plat nomor, NOP PBB, nomor aset, nomor sertifikat

            // Tanggal
            $table->date('issued_date')->nullable();
            $table->date('reminder_date');
            $table->date('expired_date');

            // Reminder
            $table->integer('reminder_days_before')->default(7);
            // berapa hari sebelum expired harus diingatkan

            $table->enum('repeat_type', [
                'none',
                'daily',
                'weekly',
                'monthly',
                'yearly',
                'custom_days',
            ])->default('none');

            $table->integer('repeat_every_days')->nullable();
            // contoh service kendaraan setiap 90 hari

            // WhatsApp
            $table->boolean('send_whatsapp')->default(true);
            $table->text('whatsapp_message')->nullable();

            // Status
            $table->enum('status', [
                'active',
                'sent',
                'done',
                'expired',
                'cancelled',
            ])->default('active');

            $table->timestamp('last_sent_at')->nullable();
            $table->timestamp('next_reminder_at')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->index(['status', 'reminder_date']);
            $table->index(['expired_date']);
            $table->index(['owner_phone']);
            $table->index(['document_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_reminders');
    }
};
