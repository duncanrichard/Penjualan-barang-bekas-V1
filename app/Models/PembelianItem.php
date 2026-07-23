<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class PembelianItem extends Model
{
    use HasFactory;

    protected $table = 'pembelian_items';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'pembelian_id',
        'data_barang_id',
        'kode_barang',
        'nama_barang',
        'jenis_barang',
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
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }

            if (empty($model->jenis_barang)) {
                $model->jenis_barang = 'mentah';
            }
        });
    }

    public function pembelian(): BelongsTo
    {
        return $this->belongsTo(Pembelian::class, 'pembelian_id');
    }

    public function dataBarang(): BelongsTo
    {
        return $this->belongsTo(DataBarang::class, 'data_barang_id');
    }

    public function stockMovement(): HasOne
    {
        return $this->hasOne(StockMovement::class, 'source_item_id')
            ->where('source_type', 'pembelian');
    }
}
