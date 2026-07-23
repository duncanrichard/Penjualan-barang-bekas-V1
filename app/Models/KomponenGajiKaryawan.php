<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KomponenGajiKaryawan extends Model
{
    protected $fillable = [
        'karyawan_id',
        'komponen_gaji_id',
        'bulan',
        'nominal_per_hari',
        'jumlah_hari',
        'total_nominal',
        'keterangan',
    ];

    protected $casts = [
        'nominal_per_hari' => 'decimal:2',
        'jumlah_hari' => 'integer',
        'total_nominal' => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::saving(function (KomponenGajiKaryawan $model) {
            $model->total_nominal =
                (float) $model->nominal_per_hari * (int) $model->jumlah_hari;
        });
    }

    public function karyawan(): BelongsTo
    {
        return $this->belongsTo(DataKaryawan::class, 'karyawan_id');
    }

    public function komponenGaji(): BelongsTo
    {
        return $this->belongsTo(KomponenGaji::class, 'komponen_gaji_id');
    }
}
