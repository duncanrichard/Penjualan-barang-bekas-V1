<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Borongan extends Model
{
    use HasFactory;
    use HasUuids;
    use SoftDeletes;

    protected $table = 'borongans';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'nomor_nota',
        'customer_id',
        'tanggal',

        'jenis_pembayaran_id',
        'metode_pembayaran',

        'subtotal',
        'penyesuaian',
        'total_akhir',

        'catatan',
        'kota',
        'tanggal_ttd',
        'nama_ttd',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'tanggal_ttd' => 'date',

        'subtotal' => 'decimal:2',
        'penyesuaian' => 'decimal:2',
        'total_akhir' => 'decimal:2',

        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(
            DataCustomer::class,
            'customer_id',
            'id'
        );
    }

    public function jenisPembayaran(): BelongsTo
    {
        return $this->belongsTo(
            JenisPembayaran::class,
            'jenis_pembayaran_id',
            'id'
        );
    }

    public function items(): HasMany
    {
        return $this->hasMany(
            BoronganItem::class,
            'borongan_id',
            'id'
        );
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(
            StockMovement::class,
            'source_id',
            'id'
        )->whereIn(
            'source_type',
            [
                'borongan_input',
                'borongan_output',
            ]
        );
    }

    public function mutasiTransaksiItems(): HasMany
    {
        return $this->hasMany(
            PengeluaranItem::class,
            'source_id',
            'id'
        )->where(
            'source_type',
            'borongan'
        );
    }
}
