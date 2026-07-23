<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DataCustomer extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'data_customers';

    protected $fillable = [
        'nama_customer',
        'no_wa',
        'alamat',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function uniqueIds(): array
    {
        return ['id'];
    }
}
