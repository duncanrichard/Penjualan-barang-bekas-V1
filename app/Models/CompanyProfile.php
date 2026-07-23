<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompanyProfile extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'nama_perusahaan',
        'alamat',
        'no_wa',
        'fonnte_api_token',
        'fonnte_enabled',
        'fonnte_connection_status',
        'fonnte_connection_message',
        'fonnte_last_checked_at',
    ];

    protected $hidden = [
        /*
         * Token asli tidak pernah dikirim ke frontend.
         */
        'fonnte_api_token',
    ];

    protected function casts(): array
    {
        return [
            /*
             * Laravel mengenkripsi token ketika disimpan
             * dan mendekripsinya ketika dibaca.
             */
            'fonnte_api_token' => 'encrypted',
            'fonnte_enabled' => 'boolean',
            'fonnte_last_checked_at' => 'datetime',
        ];
    }
}
