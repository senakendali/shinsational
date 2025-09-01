<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InfluencerRegistration extends Model
{
    protected $fillable = [
        'tiktok_user_id',
        'full_name',
        'tiktok_username',
        'phone',
        'address',
        'birth_date',
    ];

    protected $casts = [
        'birth_date' => 'date',
    ];
}
