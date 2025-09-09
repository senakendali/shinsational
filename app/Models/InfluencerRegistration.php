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
        'profile_pic_url',
        'campaign_id',
    ];

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }
}
