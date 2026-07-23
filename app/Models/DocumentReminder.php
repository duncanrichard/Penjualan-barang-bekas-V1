<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DocumentReminder extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'parent_id',
        'root_id',
        'cycle_number',

        'document_type_id',
        'document_name',
        'document_number',
        'description',

        'owner_name',
        'owner_phone',
        'owner_email',

        'object_name',
        'object_identity',

        'issued_date',
        'reminder_date',
        'expired_date',

        'reminder_days_before',
        'repeat_type',
        'repeat_every_days',

        'send_whatsapp',
        'whatsapp_message',

        'status',
        'last_sent_at',
        'next_reminder_at',

        'completed_at',
        'superseded_at',
        'created_by',
    ];

    protected $casts = [
        'issued_date' => 'date',
        'reminder_date' => 'date',
        'expired_date' => 'date',

        'send_whatsapp' => 'boolean',

        'last_sent_at' => 'datetime',
        'next_reminder_at' => 'datetime',
        'completed_at' => 'datetime',
        'superseded_at' => 'datetime',

        'cycle_number' => 'integer',
        'reminder_days_before' => 'integer',
        'repeat_every_days' => 'integer',
    ];

    protected $appends = [
        'default_whatsapp_message',
        'whatsapp_message_for_sending',
        'is_current_cycle',
        'document_type_name',
        'document_type_code',
    ];

    /**
     * Relasi ke master jenis dokumen.
     */
    public function documentType(): BelongsTo
    {
        return $this->belongsTo(
            DocumentType::class,
            'document_type_id',
            'id'
        );
    }

    /**
     * Siklus sebelumnya.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(
            self::class,
            'parent_id',
            'id'
        );
    }

    /**
     * Siklus pertama/root.
     */
    public function root(): BelongsTo
    {
        return $this->belongsTo(
            self::class,
            'root_id',
            'id'
        );
    }

    /**
     * Siklus lanjutan.
     */
    public function children(): HasMany
    {
        return $this->hasMany(
            self::class,
            'parent_id',
            'id'
        )->orderBy('cycle_number');
    }

    /**
     * Semua history berdasarkan root_id.
     */
    public function history(): HasMany
    {
        return $this->hasMany(
            self::class,
            'root_id',
            'id'
        )->orderBy('cycle_number');
    }

    /**
     * Log pengiriman reminder.
     */
    public function logs(): HasMany
    {
        return $this->hasMany(
            DocumentReminderLog::class,
            'document_reminder_id',
            'id'
        )->latest('sent_at');
    }

    /**
     * User pembuat reminder.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by',
            'id'
        );
    }

    /**
     * Nama jenis dokumen dari relasi.
     */
    public function getDocumentTypeNameAttribute(): ?string
    {
        return $this->documentType?->name;
    }

    /**
     * Kode jenis dokumen dari relasi.
     */
    public function getDocumentTypeCodeAttribute(): ?string
    {
        return $this->documentType?->code;
    }

    /**
     * Pesan WhatsApp default.
     */
    public function getDefaultWhatsappMessageAttribute(): string
    {
        $reminderDate =
            $this->reminder_date?->format('d/m/Y')
            ?? '-';

        $expiredDate =
            $this->expired_date?->format('d/m/Y')
            ?? '-';

        $documentTypeName =
            $this->documentType?->name
            ?? '-';

        return "Halo {$this->owner_name},\n\n"
            . "Ini adalah pengingat untuk:\n"
            . "Nama: {$this->document_name}\n"
            . "Jenis: {$documentTypeName}\n"
            . 'Nomor: '
            . ($this->document_number ?: '-')
            . "\n"
            . 'Objek: '
            . ($this->object_name ?: '-')
            . "\n"
            . 'Identitas: '
            . ($this->object_identity ?: '-')
            . "\n"
            . "Tanggal Reminder: {$reminderDate}\n"
            . "Jadwal/Jatuh Tempo: {$expiredDate}\n\n"
            . "Mohon segera dilakukan pengecekan, service, pembayaran, "
            . "atau perpanjangan sesuai kebutuhan.\n\n"
            . 'Terima kasih.';
    }

    /**
     * Pesan yang digunakan saat pengiriman.
     */
    public function getWhatsappMessageForSendingAttribute(): string
    {
        $customMessage = trim(
            (string) $this->whatsapp_message
        );

        return $customMessage !== ''
            ? $customMessage
            : $this->default_whatsapp_message;
    }

    /**
     * Menentukan apakah reminder merupakan siklus aktif.
     */
    public function getIsCurrentCycleAttribute(): bool
    {
        return is_null($this->superseded_at)
            && !in_array(
                $this->status,
                [
                    'cancelled',
                    'done',
                ],
                true
            );
    }
}
