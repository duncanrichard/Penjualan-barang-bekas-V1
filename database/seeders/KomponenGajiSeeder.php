<?php

namespace Database\Seeders;

use App\Models\KomponenGaji;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class KomponenGajiSeeder extends Seeder
{
    public function run(): void
    {
        $komponens = [
            'Uang Makan',
            'Uang Transportasi',
            'Tunjangan Jabatan',
            'Tunjangan Kehadiran',
            'Tunjangan Kinerja',
            'Bonus',
            'Insentif',
            'Uang Lembur Manual',
            'Tunjangan Pulsa',
            'Tunjangan Kesehatan',
        ];

        foreach ($komponens as $nama) {
            KomponenGaji::updateOrCreate(
                ['slug' => Str::slug($nama)],
                [
                    'nama_komponen' => $nama,
                    'is_active' => true,
                ]
            );
        }
    }
}
