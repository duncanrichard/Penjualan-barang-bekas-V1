<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PengeluaranDeposit extends Model
{
    use HasFactory;
    use HasUuids;

    protected $table = 'pengeluaran_deposits';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'pengeluaran_id',
        'jenis_pembayaran_id',
        'nominal',
        'catatan',
        'source_type',
        'source_id',
    ];

    protected $casts = [
        'nominal' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relasi ke transaksi pengeluaran.
     */
    public function pengeluaran(): BelongsTo
    {
        return $this->belongsTo(
            Pengeluaran::class,
            'pengeluaran_id',
            'id'
        );
    }

    /**
     * Relasi ke master jenis pembayaran.
     */
    public function jenisPembayaran(): BelongsTo
    {
        return $this->belongsTo(
            JenisPembayaran::class,
            'jenis_pembayaran_id',
            'id'
        );
    }
}
