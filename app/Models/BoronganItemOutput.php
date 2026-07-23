<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class BoronganItemOutput extends Model
{
    protected $table = 'borongan_item_outputs';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'borongan_item_id',
        'data_barang_id',
        'barang_variant_id',
        'kode_barang',
        'nama_barang',
        'jenis_barang',
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
        static::creating(function (BoronganItemOutput $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }

            if (empty($model->jenis_barang)) {
                $model->jenis_barang = 'jadi';
            }

            if ($model->harga === null || $model->harga === '') {
                $model->harga = 0;
            }

            if ($model->total === null || $model->total === '') {
                $model->total = 0;
            }

            if (empty($model->kode_barang)) {
                $model->kode_barang = '-';
            }

            if (empty($model->nama_barang)) {
                $model->nama_barang = '-';
            }

            if (empty($model->nama_varian)) {
                $model->nama_varian = '-';
            }
        });

        static::saving(function (BoronganItemOutput $model) {
            $qty = self::toDecimalValue($model->qty);
            $harga = self::toIntegerValue($model->harga);

            $model->qty = $qty;
            $model->harga = $harga;
            $model->total = round($qty * $harga, 2);

            if (empty($model->jenis_barang)) {
                $model->jenis_barang = 'jadi';
            }

            if (empty($model->kode_barang)) {
                $model->kode_barang = '-';
            }

            if (empty($model->nama_barang)) {
                $model->nama_barang = '-';
            }

            if (empty($model->nama_varian)) {
                $model->nama_varian = '-';
            }
        });
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(BoronganItem::class, 'borongan_item_id');
    }

    public function dataBarang(): BelongsTo
    {
        return $this->belongsTo(DataBarang::class, 'data_barang_id');
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(BarangVariant::class, 'barang_variant_id');
    }

    private static function toIntegerValue(mixed $value): int
    {
        if ($value === null || $value === '') {
            return 0;
        }

        if (is_int($value)) {
            return $value;
        }

        if (is_float($value)) {
            return (int) $value;
        }

        $value = trim((string) $value);
        $value = str_replace(['Rp', 'rp', 'IDR', 'idr', ' ', '.', ','], '', $value);

        return is_numeric($value) ? (int) $value : 0;
    }

    private static function toDecimalValue(mixed $value): float
    {
        if ($value === null || $value === '') {
            return 0.00;
        }

        if (is_int($value) || is_float($value)) {
            return round((float) $value, 2);
        }

        $value = trim((string) $value);
        $value = str_replace(['Rp', 'rp', 'IDR', 'idr', ' '], '', $value);

        if (str_contains($value, ',') && str_contains($value, '.')) {
            $value = str_replace('.', '', $value);
            $value = str_replace(',', '.', $value);
        } else {
            $value = str_replace(',', '.', $value);
        }

        return is_numeric($value) ? round((float) $value, 2) : 0.00;
    }
}
