<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DataKaryawan extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'data_karyawans';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'nama',
        'no_wa',
        'alamat_ktp',
        'alamat_domisili',
        'tanggal_masuk',
    ];

    protected $casts = [
        'tanggal_masuk' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];
}
