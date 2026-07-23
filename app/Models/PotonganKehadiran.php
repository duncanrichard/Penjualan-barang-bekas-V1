<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PotonganKehadiran extends Model
{
    use HasFactory;

    protected $fillable = [
        'nama_kebijakan',
        'jenis_potongan',
        'toleransi_menit',
        'nominal',
        'keterangan',
        'is_active',
    ];

    protected $casts = [
        'toleransi_menit' => 'integer',
        'nominal' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    protected $appends = [
        'jenis_potongan_label',
        'nominal_format',
        'status_label',
    ];

    public function getJenisPotonganLabelAttribute(): string
    {
        return match ($this->jenis_potongan) {
            'jam_masuk' => 'Keterlambatan Jam Masuk',
            'jam_keluar' => 'Lembur',
            default => '-',
        };
    }

    public function getNominalFormatAttribute(): string
    {
        return 'Rp ' . number_format((float) $this->nominal, 0, ',', '.');
    }

    public function getStatusLabelAttribute(): string
    {
        return $this->is_active ? 'Aktif' : 'Nonaktif';
    }
}
