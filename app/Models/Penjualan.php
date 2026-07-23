<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Penjualan extends Model
{
    use HasFactory;
    use HasUuids;
    use SoftDeletes;

    protected $table = 'penjualans';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'nomor_nota',
        'customer_id',
        'tanggal',
        'jenis_pembayaran_id',
        'metode_pembayaran',
        'subtotal',
        'catatan_transaksi',
        'nilai_catatan_transaksi',
        'catatan_power_box',
        'nilai_catatan_power_box',
        'penyesuaian',
        'total_akhir',
        'catatan',
        'kota',
        'tanggal_ttd',
        'nama_ttd',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'tanggal_ttd' => 'date',
        'subtotal' => 'decimal:2',
        'nilai_catatan_transaksi' => 'decimal:2',
        'nilai_catatan_power_box' => 'decimal:2',
        'penyesuaian' => 'decimal:2',
        'total_akhir' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(DataCustomer::class, 'customer_id', 'id');
    }

    public function jenisPembayaran(): BelongsTo
    {
        return $this->belongsTo(JenisPembayaran::class, 'jenis_pembayaran_id', 'id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PenjualanItem::class, 'penjualan_id', 'id');
    }

    public function catatans(): HasMany
    {
        return $this->hasMany(PenjualanCatatan::class, 'penjualan_id', 'id');
    }

    public function catatanTransaksi(): HasMany
    {
        return $this->hasMany(PenjualanCatatan::class, 'penjualan_id', 'id')
            ->where('tipe', 'transaksi');
    }

    public function catatanPowerBox(): HasMany
    {
        return $this->hasMany(PenjualanCatatan::class, 'penjualan_id', 'id')
            ->where('tipe', 'power_box');
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class, 'source_id', 'id')
            ->where('source_type', 'penjualan');
    }

    public function mutasiMasuk(): HasMany
    {
        return $this->hasMany(PengeluaranDeposit::class, 'source_id', 'id')
            ->where('source_type', 'penjualan');
    }
}
