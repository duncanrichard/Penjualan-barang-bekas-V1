<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class DataBarang extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'data_barangs';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'kategori_id',
        'kode',
        'nama_barang',
    ];

    protected $casts = [
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
        });
    }

    public function kategori(): BelongsTo
    {
        return $this->belongsTo(KategoriBarang::class, 'kategori_id');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(BarangVariant::class, 'data_barang_id');
    }

    public function pembelianItems(): HasMany
    {
        return $this->hasMany(PembelianItem::class, 'data_barang_id');
    }

    public function boronganItems(): HasMany
    {
        return $this->hasMany(BoronganItem::class, 'data_barang_id');
    }

    public function boronganOutputItems(): HasMany
    {
        return $this->hasMany(BoronganItemOutput::class, 'data_barang_id');
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class, 'data_barang_id');
    }

    public function getStokMentahAttribute(): float
    {
        $row = $this->stockMovements()
            ->where('jenis_barang', 'mentah')
            ->selectRaw('COALESCE(SUM(qty_masuk),0) - COALESCE(SUM(qty_keluar),0) as stok')
            ->first();

        return round((float) ($row->stok ?? 0), 2);
    }

    public function getStokJadiAttribute(): float
    {
        $row = $this->stockMovements()
            ->where('jenis_barang', 'jadi')
            ->selectRaw('COALESCE(SUM(qty_masuk),0) - COALESCE(SUM(qty_keluar),0) as stok')
            ->first();

        return round((float) ($row->stok ?? 0), 2);
    }

    public function getStokTotalAttribute(): float
    {
        return round($this->stok_mentah + $this->stok_jadi, 2);
    }
}
