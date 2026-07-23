<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class AbsensiKaryawan extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'absensi_karyawans';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'karyawan_id',
        'tanggal',
        'jam_masuk',
        'jam_pulang',
        'keterangan_masuk',
        'keterangan_pulang',
        'keterangan',
    ];

    protected $casts = [
        'tanggal' => 'date',
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

    public function karyawan(): BelongsTo
    {
        return $this->belongsTo(DataKaryawan::class, 'karyawan_id');
    }
}
