<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Pengeluaran extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'pengeluarans';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tanggal',
        'deposit_cash',
        'total_cash',
        'total_tf',
        'sisa_cash',
        'status',
        'opened_at',
        'closed_at',
        'catatan_buka',
        'catatan_tutup',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'deposit_cash' => 'decimal:2',
        'total_cash' => 'decimal:2',
        'total_tf' => 'decimal:2',
        'sisa_cash' => 'decimal:2',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }

            if (empty($model->status)) {
                $model->status = 'open';
            }
        });
    }

    public function items(): HasMany
    {
        return $this->hasMany(PengeluaranItem::class, 'pengeluaran_id');
    }

    public function deposits(): HasMany
    {
        return $this->hasMany(PengeluaranDeposit::class, 'pengeluaran_id');
    }
}
