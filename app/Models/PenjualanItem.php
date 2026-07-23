<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PenjualanItem extends Model
{
    use HasUuids;

    protected $table = 'penjualan_items';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'penjualan_id',
        'data_barang_id',
        'barang_variant_id',
        'kode_barang',
        'nama_barang',
        'nama_varian',
        'qty',
        'harga',
        'total',
    ];

    protected $casts = [
        'qty' => 'decimal:2',
        'harga' => 'integer',
        'total' => 'decimal:2',

        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(
            function (PenjualanItem $model): void {
                if (empty($model->kode_barang)) {
                    $model->kode_barang = '-';
                }

                if (empty($model->nama_barang)) {
                    $model->nama_barang = '-';
                }
            }
        );
    }

    public function penjualan(): BelongsTo
    {
        return $this->belongsTo(
            Penjualan::class,
            'penjualan_id',
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

    public function variant(): BelongsTo
    {
        return $this->belongsTo(
            BarangVariant::class,
            'barang_variant_id',
            'id'
        );
    }
}
