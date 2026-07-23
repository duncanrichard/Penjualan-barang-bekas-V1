<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class StockMovement extends Model
{
    protected $table = 'stock_movements';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'data_barang_id',
        'barang_variant_id',
        'jenis_barang',
        'qty_masuk',
        'qty_keluar',
        'source_type',
        'source_id',
        'source_item_id',
        'source_output_id',
        'tanggal',
        'keterangan',
    ];

    protected $casts = [
        'qty_masuk' => 'decimal:2',
        'qty_keluar' => 'decimal:2',
        'tanggal' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }

            if (empty($model->jenis_barang)) {
                $model->jenis_barang = 'mentah';
            }

            if ($model->qty_masuk === null) {
                $model->qty_masuk = 0;
            }

            if ($model->qty_keluar === null) {
                $model->qty_keluar = 0;
            }
        });
    }

    public function dataBarang(): BelongsTo
    {
        return $this->belongsTo(DataBarang::class, 'data_barang_id');
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(BarangVariant::class, 'barang_variant_id');
    }

    public function pembelian(): BelongsTo
    {
        return $this->belongsTo(Pembelian::class, 'source_id');
    }

    public function pembelianItem(): BelongsTo
    {
        return $this->belongsTo(PembelianItem::class, 'source_item_id');
    }

    public function borongan(): BelongsTo
    {
        return $this->belongsTo(Borongan::class, 'source_id');
    }

    public function boronganItem(): BelongsTo
    {
        return $this->belongsTo(BoronganItem::class, 'source_item_id');
    }

    public function penjualan(): BelongsTo
    {
        return $this->belongsTo(Penjualan::class, 'source_id');
    }

    public function penjualanItem(): BelongsTo
    {
        return $this->belongsTo(PenjualanItem::class, 'source_item_id');
    }
}
