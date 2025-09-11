<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InfluencerAccount extends Model
{
    protected $fillable = [
        'tiktok_user_id',
        'tiktok_username',
        'full_name',
        'avatar_url',
        'token_type',
        'access_token',
        'refresh_token',
        'expires_at',
        'last_refreshed_at',
        'revoked_at',
        'scopes',
    ];

    protected $casts = [
        'expires_at'        => 'datetime',
        'last_refreshed_at' => 'datetime',
        'revoked_at'        => 'datetime',
        'scopes'            => 'array',

        // Laravel 10+: terenkripsi otomatis. Kalau <10, lihat catatan di bawah.
        'access_token'      => 'encrypted',
        'refresh_token'     => 'encrypted',
    ];

    protected $hidden = [
        'access_token',
        'refresh_token',
    ];

    public function isExpired(): bool
    {
        return $this->expires_at ? now()->greaterThanOrEqualTo($this->expires_at) : false;
    }

    public function willExpireSoon(int $seconds = 300): bool
    {
        return $this->expires_at ? now()->addSeconds($seconds)->greaterThanOrEqualTo($this->expires_at) : false;
    }
}
