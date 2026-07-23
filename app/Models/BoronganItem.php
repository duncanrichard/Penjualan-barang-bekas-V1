<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BoronganItem extends Model
{
    use HasUuids;

    protected $table = 'borongan_items';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'borongan_id',
        'data_barang_id',
        'kode_barang',
        'nama_barang',
        'input_jenis_barang',
        'qty',
        'output_qty',
    ];

    protected $casts = [
        'qty' => 'decimal:2',
        'output_qty' => 'decimal:2',

        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(
            function (BoronganItem $model): void {
                if (empty($model->input_jenis_barang)) {
                    $model->input_jenis_barang = 'mentah';
                }
            }
        );
    }

    public function borongan(): BelongsTo
    {
        return $this->belongsTo(
            Borongan::class,
            'borongan_id',
            'id'
        );
    }

    public function dataBarang(): BelongsTo
    {
        return $this->belongsTo(
            DataBarang::class,
            'data_barang_id',
            'id'
        );
    }

    public function outputs(): HasMany
    {
        return $this->hasMany(
            BoronganItemOutput::class,
            'borongan_item_id',
            'id'
        );
    }
}
