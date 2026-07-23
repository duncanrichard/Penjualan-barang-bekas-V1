<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PenggajianKaryawan extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'penggajian_karyawans';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'data_karyawan_id',
        'kategori_penggajian_id',
        'nominal',
        'keterangan',
    ];

    protected $casts = [
        'nominal' => 'decimal:2',
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

    public function dataKaryawan()
    {
        return $this->belongsTo(DataKaryawan::class, 'data_karyawan_id');
    }

    public function kategoriPenggajian()
    {
        return $this->belongsTo(KategoriPenggajian::class, 'kategori_penggajian_id');
    }
}
