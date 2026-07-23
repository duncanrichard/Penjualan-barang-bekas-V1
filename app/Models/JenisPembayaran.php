<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JenisPembayaran extends Model
{
    use HasFactory;
    use HasUuids;

    protected $table = 'jenis_pembayarans';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'nama',
        'kode',
        'is_cash',
        'is_active',
    ];

    protected $casts = [
        'is_cash' => 'boolean',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function pengeluaranItems(): HasMany
    {
        return $this->hasMany(
            PengeluaranItem::class,
            'jenis_pembayaran_id',
            'id'
        );
    }

    public function pengeluaranDeposits(): HasMany
    {
        return $this->hasMany(
            PengeluaranDeposit::class,
            'jenis_pembayaran_id',
            'id'
        );
    }
}
