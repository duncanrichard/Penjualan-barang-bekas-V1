<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KomponenGaji extends Model
{
    protected $fillable = [
        'nama_komponen',
        'slug',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function komponenKaryawan(): HasMany
    {
        return $this->hasMany(KomponenGajiKaryawan::class);
    }
}
