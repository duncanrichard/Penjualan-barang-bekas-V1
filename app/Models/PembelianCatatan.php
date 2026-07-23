<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PembelianCatatan extends Model
{
    use HasFactory;

    protected $table = 'pembelian_catatans';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'pembelian_id',
        'tipe',
        'catatan',
        'nominal',
        'karyawan_ids',
        'nominal_per_karyawan',
    ];

    protected $casts = [
        'nominal' => 'decimal:2',
        'karyawan_ids' => 'array',
        'nominal_per_karyawan' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function pembelian(): BelongsTo
    {
        return $this->belongsTo(Pembelian::class, 'pembelian_id');
    }
}
