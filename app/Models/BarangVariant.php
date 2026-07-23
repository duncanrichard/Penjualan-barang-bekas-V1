<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class BarangVariant extends Model
{
    use HasFactory;

    protected $table = 'barang_variants';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'data_barang_id',
        'nama',
        'kode',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }

            if (empty($model->kode)) {
                $model->kode = Str::slug($model->nama, '_');
            }
        });
    }

    public function dataBarang(): BelongsTo
    {
        return $this->belongsTo(DataBarang::class, 'data_barang_id');
    }
}
