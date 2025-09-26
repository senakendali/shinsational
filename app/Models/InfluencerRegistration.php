<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InfluencerRegistration extends Model
{
    protected $fillable = [
        // existing fields
        'tiktok_user_id',
        'full_name',
        'tiktok_username',
        'phone',
        'email',
        'address',
        'followers_count',
        'birth_date',
        'gender',
        'profile_pic_url',
        'campaign_id',

        // OAuth token fields (baru)
        'token_type',
        'access_token',
        'refresh_token',
        'expires_at',
        'last_refreshed_at',
        'revoked_at',
        'scopes',
    ];

    protected $casts = [
        // data bawaan
        'birth_date'        => 'date',

        // token & meta
        'scopes'            => 'array',
        'expires_at'        => 'datetime',
        'last_refreshed_at' => 'datetime',
        'revoked_at'        => 'datetime',

        // Laravel 10+: simpan terenkripsi dengan APP_KEY
        'access_token'      => 'encrypted',
        'refresh_token'     => 'encrypted',
    ];

    // jangan ikutkan token di response JSON
    protected $hidden = [
        'access_token',
        'refresh_token',
    ];

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }

    // Helpers
    public function isExpired(): bool
    {
        return $this->expires_at ? now()->greaterThanOrEqualTo($this->expires_at) : false;
    }

    public function willExpireSoon(int $seconds = 300): bool
    {
        return $this->expires_at ? now()->addSeconds($seconds)->greaterThanOrEqualTo($this->expires_at) : false;
    }
}
